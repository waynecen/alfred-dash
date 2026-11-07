import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useDismiss from '../../hooks/useDismiss';
import useSettings from '../../hooks/useSettings';
import { addDays, addMonths, parseISODate, startOfWeek, toISODate } from '../../utils/dates';
import { firstOfMonth, monthWeeks, stepFor } from '../../utils/monthGrid';
import './DatePicker.css';

const label = (iso, options) => parseISODate(iso).toLocaleDateString(undefined, options);

// How far the panel keeps from its button and from the window's edges, in pixels.
const GAP = 4;
const MARGIN = 8;

// Puts the panel under its button, or over it when there is no room below, and always inside
// the window. It is fixed to the window, so it follows the button when a widget scrolls.
function place(panel, button) {
  if (!panel || !button) return;
  const anchor = button.getBoundingClientRect();
  const { width, height } = panel.getBoundingClientRect();
  const room = window.innerHeight - MARGIN;
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - height;
  const top = below + height <= room || above < MARGIN ? Math.min(below, room - height) : above;
  const left = Math.min(anchor.left, window.innerWidth - MARGIN - width);
  panel.style.top = `${Math.max(MARGIN, top)}px`;
  panel.style.left = `${Math.max(MARGIN, left)}px`;
}

// A button that opens a month to pick a day from, set in the dashboard's own type and rules. It
// stands in for the browser's date picker, which no stylesheet can reach. The panel is drawn over
// the page, outside the widget, so a widget's scrolling edge never cuts it off.
//   value: 'YYYY-MM-DD' | null    onChange(date | null), only when the day changes
//   today: 'YYYY-MM-DD'    title: the panel's name for screen readers, e.g. "Due date: Call bank"
//   buttonProps: what the button needs besides its text (className, aria-label, onKeyDown, …)
//   children: the button's text
// In the panel the arrow keys move a day or a week, Page Up and Page Down a month, Home and End to
// the ends of the week; Enter picks the day and Escape closes without picking.
function DatePicker({ value, onChange, today = toISODate(), title = 'Choose a date', buttonProps = {}, children }) {
  const [{ weekStart }] = useSettings();
  const [open, setOpen] = useState(false);
  // The day the keyboard is on, which is not picked until Enter (or a click).
  const [focusDate, setFocusDate] = useState(value ?? today);
  const button = useRef(null);
  const panel = useRef(null);
  const cells = useRef(new Map());
  // Set when the keyboard moved to another day, so that day takes focus once it is drawn.
  const moveFocus = useRef(false);
  const id = useId();

  function show() {
    setFocusDate(value ?? today);
    moveFocus.current = true;
    setOpen(true);
  }

  // A pick and Escape hand focus back to the button; a click elsewhere leaves it where it went.
  function close({ refocus = true } = {}) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function choose(date) {
    if (date !== value) onChange(date);
    close();
  }

  useDismiss(
    panel,
    (reason, event) => {
      // A click on the button itself closes the panel through the button.
      if (reason === 'outside' && button.current?.contains(event.target)) return;
      close({ refocus: reason === 'escape' });
    },
    open
  );

  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => place(panel.current, button.current);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true); // true: a widget scrolling, not only the page
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    cells.current.get(focusDate)?.focus({ preventScroll: true });
  }, [open, focusDate]);

  function handleGridKey(event) {
    const next = stepFor(event.key, focusDate, weekStart);
    if (!next) return;
    event.preventDefault();
    moveFocus.current = true;
    setFocusDate(next);
  }

  // The panel's keys are its own: no page shortcut, and no key of the task row behind it, sees
  // them. Tab goes round the panel's controls, as in any dialog.
  function handlePanelKey(event) {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const items = [...panel.current.querySelectorAll('button:not(:disabled)')].filter((item) => item.tabIndex >= 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  const month = firstOfMonth(focusDate);
  const weeks = monthWeeks(month, weekStart);
  const quick = [
    { name: 'Today', date: today },
    { name: 'Tomorrow', date: addDays(today, 1) },
    { name: 'Next week', date: addDays(startOfWeek(today, weekStart), 7) },
  ];

  function renderDay(date) {
    const classes = [
      'date-picker-day',
      date.slice(0, 7) !== month.slice(0, 7) && 'is-outside',
      date === today && 'is-today',
      date === value && 'is-chosen',
    ].filter(Boolean);
    return (
      <button
        key={date}
        ref={(node) => (node ? cells.current.set(date, node) : cells.current.delete(date))}
        type="button"
        role="gridcell"
        className={classes.join(' ')}
        tabIndex={date === focusDate ? 0 : -1}
        aria-selected={date === value}
        aria-current={date === today ? 'date' : undefined}
        aria-label={label(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        onClick={() => choose(date)}
      >
        <span className="date-picker-number">{Number(date.slice(8))}</span>
      </button>
    );
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        {...buttonProps}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : show())}
      >
        {children}
      </button>
      {open &&
        createPortal(
          // Clicks stop here too, so a row behind the panel doesn't take a pick as its own click.
          <div
            ref={panel}
            id={id}
            className="date-picker"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={handlePanelKey}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="date-picker-bar">
              <h2 className="date-picker-heading" aria-live="polite">
                {label(month, { month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" className="date-picker-nav" onClick={() => setFocusDate((date) => addMonths(date, -1))} aria-label="Previous month">
                ‹
              </button>
              <button type="button" className="date-picker-nav" onClick={() => setFocusDate((date) => addMonths(date, 1))} aria-label="Next month">
                ›
              </button>
            </div>

            <div className="date-picker-grid" role="grid" aria-label={label(month, { month: 'long', year: 'numeric' })} onKeyDown={handleGridKey}>
              <div role="row" className="date-picker-row">
                {weeks[0].map((date) => (
                  <span key={date} role="columnheader" className="date-picker-weekday" aria-label={label(date, { weekday: 'long' })}>
                    {label(date, { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div key={week[0]} role="row" className="date-picker-row">
                  {week.map(renderDay)}
                </div>
              ))}
            </div>

            <div className="date-picker-quick">
              {quick.map(({ name, date }) => (
                <button
                  key={name}
                  type="button"
                  className={date === value ? 'is-chosen' : undefined}
                  aria-pressed={date === value}
                  onClick={() => choose(date)}
                  title={label(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                >
                  {name}
                </button>
              ))}
            </div>
            {value && (
              <button type="button" className="date-picker-clear" onClick={() => choose(null)}>
                Clear
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default DatePicker;
