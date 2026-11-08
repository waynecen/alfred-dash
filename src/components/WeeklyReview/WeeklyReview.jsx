import { useEffect, useId, useRef, useState } from 'react';
import useDismiss from '../../hooks/useDismiss';
import useFocusTrap from '../../hooks/useFocusTrap';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import { useAI } from '../../hooks/useAI';
import CompletionChart from '../SummaryWidget/CompletionChart';
import ProgressBar from '../ProgressBar/ProgressBar';
import { describeProgress, goalProgress, isReached } from '../../data/goals';
import { focusByDay, habitsIn, overdueTasks, reviewStats, reviewWeek, tasksDoneIn, topFocusTask } from '../../data/reviews';
import { habitStreaks } from '../../utils/streaks';
import { addDays, formatDay, parseISODate, relativeDay, startOfNextWeek, toISODate } from '../../utils/dates';
import { plural } from '../../utils/text';
import './WeeklyReview.css';

const STEPS = ['Done', 'Overdue', 'Habits', 'Focus', 'Goals', 'Reflect'];
// The done list stops here, so a busy week doesn't push the rest off the page.
const SHOWN_DONE = 12;

const SYSTEM_PROMPT = `You help one person look back on their week, from what they did, what slipped, their habits, focus time and goals.
Write a short reflection of at most 120 words, in plain text with no Markdown, as three short paragraphs: what went well, what slipped, and one concrete suggestion for next week.
Be specific and kind. Use only what is given; never invent tasks, habits or numbers.`;


// "2–8 November", in the user's own order, or a plain "2 Nov – 8 Nov" where ranges can't be formatted.
function describeRange({ from, to }) {
  const format = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });
  try {
    return format.formatRange(parseISODate(from), parseISODate(to));
  } catch {
    return `${format.format(parseISODate(from))} – ${format.format(parseISODate(to))}`;
  }
}

// "3 h 20 min", or "45 min".
function describeMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

// How this week compares with the one before: "2 more than the week before".
function compareWeeks(now, before) {
  if (now === before) return 'The same as the week before.';
  return `${Math.abs(now - before)} ${now > before ? 'more' : 'fewer'} than the week before.`;
}

// The week in words, for Claude to reflect on.
function buildPrompt({ week, partial, done, late, habitRows, focusDays, goalRows, notes }) {
  const list = (items, max) => items.slice(0, max).join('; ') + (items.length > max ? `; and ${items.length - max} more` : '');
  return [
    `The week of ${describeRange(week)}${partial ? ', so far' : ''}.`,
    `Tasks done (${done.length}): ${list(done.map((task) => task.text), 15) || 'none'}.`,
    `Overdue now (${late.length}): ${list(late.map((task) => task.text), 10) || 'none'}.`,
    `Habits: ${habitRows.map(({ habit, due, done: hit, streak }) => `${habit.name}, ${hit} of ${due} days, streak ${streak}`).join('; ') || 'none'}.`,
    `Focus minutes by day: ${focusDays.map((day) => `${formatDay(day.date, { weekday: 'short' })} ${day.count}`).join(', ')}.`,
    `Goals: ${goalRows.map(({ goal, figure }) => `${goal.title}, ${figure}`).join('; ') || 'none'}.`,
    `Their own notes: ${notes.trim() || '(none)'}`,
  ].join('\n');
}

// A large figure with its label under it, as in the Summary widget.
function Figure({ value, label }) {
  return (
    <p className="review-figure">
      <strong>{value}</strong>
      <span className="label">{label}</span>
    </p>
  );
}

// The weekly review: a full-page sheet that walks through the week in six steps. What got done,
// what is overdue (moved on in a click), habits, focus time and goals, then notes and, if wanted,
// a short reflection from Claude. Saving keeps the notes and the week's numbers; closing with
// notes written saves them too, so nothing typed is lost.
//   tasks, habits, habitLog, sessions (focus log), goals: shared dashboard data
//   reviews: those saved, to pick up this week's notes again
//   actions: { rescheduleTask, updateTasks, toggleTask, notify }
//   onSave(review)    onClose()
function WeeklyReview({ tasks, habits, habitLog, sessions, goals, reviews, actions, onSave, onClose }) {
  const today = useToday();
  const [{ weekStart }] = useSettings();
  const week = reviewWeek(today, weekStart);
  const partial = week.to === today;
  const saved = reviews.find((review) => review.week === week.from);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [reflection, setReflection] = useState(saved?.reflection ?? '');
  const ai = useAI();
  const ref = useRef(null);
  const heading = useRef(null);
  const headingId = useId();
  const notesId = useId();
  const firstStep = useRef(true);

  useFocusTrap(ref);

  // Keep a finished reflection; a stopped or failed one is not worth keeping.
  useEffect(() => {
    if (ai.status === 'done' && ai.text) setReflection(ai.text);
  }, [ai.status, ai.text]);

  // A new step moves focus to its heading, so a screen reader starts reading there.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const done = tasksDoneIn(tasks, week);
  const doneBefore = tasksDoneIn(tasks, { from: addDays(week.from, -7), to: addDays(week.from, -1) }).length;
  const late = overdueTasks(tasks, today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const habitRows = habitsIn(habits, habitLog, week).map((row) => ({
    ...row,
    streak: habitStreaks(row.habit, habitLog[row.habit.id] ?? [], today).current,
  }));
  const focusDays = focusByDay(sessions, week);
  const focusTotal = focusDays.reduce((sum, day) => sum + day.count, 0);
  const focusSessions = sessions.filter((session) => {
    const day = toISODate(session.startedAt);
    return day >= week.from && day <= week.to;
  }).length;
  const top = topFocusTask(sessions, week);
  const topTask = top && tasks.find((task) => task.id === top.taskId);
  const goalRows = goals.map((goal) => {
    const progress = goalProgress(goal, tasks);
    return { goal, progress, reached: isReached(progress), figure: describeProgress(goal, progress) };
  });

  function save() {
    onSave({
      week: week.from,
      notes: notes.trim(),
      reflection,
      stats: reviewStats({ tasks, habits, habitLog, sessions, goals, week, today }),
    });
    actions.notify({ message: `Weekly review saved: ${describeRange(week)}` });
    onClose();
  }

  // Notes typed but not saved are kept, by saving the review as it stands.
  function close() {
    if (notes.trim() && notes.trim() !== (saved?.notes ?? '')) save();
    else onClose();
  }

  useDismiss(ref, close);

  function reflect() {
    ai.send({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt({ week, partial, done, late, habitRows, focusDays, goalRows, notes }) }],
      effort: 'low',
    });
  }

  const tomorrow = addDays(today, 1);
  const nextWeek = startOfNextWeek(today, weekStart);

  // An overdue task moved on (or done) leaves the list; focus goes to the next one, not to the page.
  function moveOn(task, run) {
    const list = ref.current?.querySelector('.review-overdue');
    const index = late.indexOf(task);
    run();
    requestAnimationFrame(() => {
      const rows = list?.querySelectorAll('.review-row-actions') ?? [];
      const next = rows[Math.min(index, rows.length - 1)]?.querySelector('button');
      (next ?? heading.current)?.focus();
    });
  }

  const steps = [
    // Done
    <>
      <Figure value={done.length} label={done.length === 1 ? 'task done' : 'tasks done'} />
      <p className="review-note">{compareWeeks(done.length, doneBefore)}</p>
      {done.length ? (
        <ul className="review-list">
          {done.slice(0, SHOWN_DONE).map((task) => (
            <li key={task.id} className="review-row">
              <span className="review-row-title">{task.text}</span>
              <span className="review-row-meta label">{formatDay(toISODate(task.completedAt), { weekday: 'short' })}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="review-note">Nothing ticked off {partial ? 'yet this week' : 'that week'}.</p>
      )}
      {done.length > SHOWN_DONE && <p className="review-note">And {done.length - SHOWN_DONE} more.</p>}
    </>,

    // Overdue
    <>
      <Figure value={late.length} label="overdue" />
      {late.length ? (
        <>
          <p className="review-note">Give each a new day, or tick it off.</p>
          <div className="review-bulk">
            <button type="button" onClick={() => actions.updateTasks(late.map((task) => task.id), { dueDate: tomorrow })}>
              All to tomorrow
            </button>
            <button type="button" onClick={() => actions.updateTasks(late.map((task) => task.id), { dueDate: nextWeek })}>
              All to next week
            </button>
          </div>
          <ul className="review-list review-overdue">
            {late.map((task) => (
              <li key={task.id} className="review-row">
                <span className="review-row-title">{task.text}</span>
                <span className="review-row-meta label">{relativeDay(task.dueDate, parseISODate(today))}</span>
                <span className="review-row-actions">
                  <button type="button" onClick={() => moveOn(task, () => actions.rescheduleTask(task.id, tomorrow))} aria-label={`Move to tomorrow: ${task.text}`}>
                    Tomorrow
                  </button>
                  <button type="button" onClick={() => moveOn(task, () => actions.rescheduleTask(task.id, nextWeek))} aria-label={`Move to next week: ${task.text}`}>
                    Next week
                  </button>
                  <button type="button" onClick={() => moveOn(task, () => actions.toggleTask(task.id))} aria-label={`Mark done: ${task.text}`}>
                    Done
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="review-note">Nothing overdue. Well kept.</p>
      )}
    </>,

    // Habits
    habitRows.length ? (
      <>
        <Figure
          value={`${habitRows.reduce((sum, row) => sum + row.done, 0)} of ${habitRows.reduce((sum, row) => sum + row.due, 0)}`}
          label="habit days kept"
        />
        <ul className="review-list">
          {habitRows.map(({ habit, due, done: hit, streak }) => (
            <li key={habit.id} className="review-row review-row-bar">
              <span className="review-row-title">{habit.name}</span>
              <span className="review-row-meta label">
                {hit} of {due} · {plural(streak, 'day')} in a row
              </span>
              <ProgressBar value={hit} max={Math.max(due, 1)} label={habit.name} valueText={`${hit} of ${due} days`} className="review-row-progress" />
            </li>
          ))}
        </ul>
      </>
    ) : (
      <p className="review-note">No habits yet. Add some in the Habits widget to see them here.</p>
    ),

    // Focus
    <>
      <Figure value={describeMinutes(focusTotal)} label="focused" />
      {focusTotal ? (
        <>
          <CompletionChart
            days={focusDays}
            title="Focus by day"
            unit="min"
            label="Focus minutes each day"
            current={focusDays.findIndex((day) => day.date === today)}
            summary={plural(focusSessions, 'session')}
          />
          {topTask && (
            <p className="review-note">
              Most time on “{topTask.text}”: {describeMinutes(top.minutes)}.
            </p>
          )}
        </>
      ) : (
        <p className="review-note">No focus sessions {partial ? 'yet this week' : 'that week'}. The Focus timer keeps a log of them.</p>
      )}
    </>,

    // Goals
    goalRows.length ? (
      <>
        <Figure value={`${goalRows.filter((row) => row.reached).length} of ${goalRows.length}`} label="goals reached" />
        <ul className="review-list">
          {goalRows.map(({ goal, progress, reached, figure }) => (
            <li key={goal.id} className="review-row review-row-bar">
              <span className="review-row-title">{goal.title}</span>
              <span className="review-row-meta label">
                {reached ? 'Reached · ' : ''}
                {figure}
                {goal.dueDate && !reached ? ` · by ${formatDay(goal.dueDate, { day: 'numeric', month: 'short' })}` : ''}
              </span>
              <ProgressBar value={progress.done} max={Math.max(progress.total, 1)} label={goal.title} valueText={figure} className="review-row-progress" />
            </li>
          ))}
        </ul>
      </>
    ) : (
      <p className="review-note">No goals yet. Set some in the Goals widget to follow them here.</p>
    ),

    // Reflect
    <>
      <div className="review-notes">
        <label htmlFor={notesId} className="label">Notes for the week</label>
        <textarea
          id={notesId}
          rows={5}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What went well? What will you change next week?"
        />
      </div>
      <div className="review-ai">
        {ai.busy ? (
          <button type="button" onClick={ai.stop}>
            Stop
          </button>
        ) : (
          <button type="button" onClick={reflect}>
            {reflection ? 'Ask Claude again' : 'Ask Claude to reflect'}
          </button>
        )}
        <span className="review-note">{ai.busy ? 'Writing…' : 'Optional: a short reflection on the week, from what is above.'}</span>
      </div>
      {ai.status === 'error' && (
        <p className="review-note review-error" role="alert">
          {ai.error}
        </p>
      )}
      {(ai.busy || reflection) && (
        <blockquote className="review-reflection" aria-live="polite" aria-busy={ai.busy || undefined}>
          {ai.busy ? ai.text || 'Reading your week…' : reflection}
        </blockquote>
      )}
    </>,
  ];

  return (
    <div className="review-backdrop">
      <div ref={ref} className="review" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <header className="review-header">
          <p className="review-kicker">
            Weekly review{partial ? ' · this week so far' : ''}
            {saved ? ` · saved ${formatDay(toISODate(saved.savedAt), { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
          </p>
          <h2 id={headingId}>{describeRange(week)}</h2>
          <button type="button" className="icon-button review-close" onClick={close} aria-label="Close the review">
            ×
          </button>
        </header>

        <div className="review-body">
          <ol className="review-steps" aria-label="Steps">
            {STEPS.map((name, index) => (
              <li key={name}>
                <button type="button" aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>
                  <span className="review-step-number">{String(index + 1).padStart(2, '0')}</span>{' '}
                  {name}
                </button>
              </li>
            ))}
          </ol>

          <section className="review-step" aria-labelledby={`${headingId}-step`}>
            <h3 id={`${headingId}-step`} ref={heading} tabIndex={-1} data-autofocus>
              <span className="review-step-number">{String(step + 1).padStart(2, '0')}</span>{' '}
              {STEPS[step]}
            </h3>
            {steps[step]}
          </section>
        </div>

        <footer className="review-footer">
          <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="review-next" onClick={() => setStep(step + 1)}>
              Next: {STEPS[step + 1]}
            </button>
          ) : (
            <button type="button" className="review-next" onClick={save}>
              Save review
            </button>
          )}
          <span className="review-count label">
            {step + 1} of {STEPS.length}
          </span>
        </footer>
      </div>
    </div>
  );
}

export default WeeklyReview;
