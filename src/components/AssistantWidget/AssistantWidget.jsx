import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import useAssistant, { isRecap, questionOf, replyText } from '../../hooks/useAssistant';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import { hourCycle } from '../../data/settings';
import { actionFor } from '../../utils/assistantActions';
import { buildDashboardContext } from '../../utils/dashboardContext';
import './AssistantWidget.css';

// Things to try, for an empty chat.
const STARTERS = ['What should I focus on today?', 'Move everything overdue to tomorrow', 'Plan my afternoon around my events'];

// What a proposal's card says once it is settled.
const STATUS_TEXT = {
  applied: 'Applied',
  undone: 'Undone',
  dismissed: 'Dismissed',
  skipped: 'Not applied',
  failed: 'Couldn’t apply',
  invalid: 'Couldn’t read this',
};

const WORKING = { thinking: 'Thinking…', writing: 'Writing…', proposing: 'Preparing changes…' };

// A chat with Claude about the dashboard. Claude sees a snapshot of it with each message and
// can propose changes, each shown as a card: nothing changes until Apply, and every Apply can be
// undone. The chat is kept between visits. (The registry shows it only when the AI is reachable.)
//   data: { tasks, events, habits, habitLog, goals, focus, notes }
//   actions: the dashboard's actions    notify: shows a toast
//   request: { text, n } from "Ask Claude" in the command palette, sent once it arrives;
//     onRequestHandled() says it was, so it isn't sent again
function AssistantWidget({ data, actions, notify, request, onRequestHandled }) {
  const today = useToday();
  const [{ weekStart, timeFormat }] = useSettings();
  const facts = { ...data, today, hour: hourCycle(timeFormat) };
  const assistant = useAssistant({
    getContext: () => buildDashboardContext(data, { weekStart }),
    data: facts,
    actions,
    notify,
  });
  const { chat, ai } = assistant;
  const [draft, setDraft] = useState('');
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const id = useId();
  // Whether the reader is at the foot of the chat, where new text should keep them.
  const pinned = useRef(true);

  function send(text = draft) {
    if (assistant.ask(text)) setDraft('');
  }

  // A question that couldn't be sent comes back to the input, to send again.
  useEffect(() => {
    if (!assistant.restoredQuestion) return;
    setDraft(assistant.restoredQuestion.text);
    inputRef.current?.focus();
  }, [assistant.restoredQuestion]);

  // "Ask Claude: …" from the command palette, also when it brought this widget onto the board.
  useEffect(() => {
    if (!request) return;
    onRequestHandled?.(request.n);
    if (!assistant.ask(request.text)) notify({ message: 'Claude is still answering. Ask again when it has finished.' });
  }, [request?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the reply as it comes in, unless the reader has scrolled up to read something.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && pinned.current) log.scrollTop = log.scrollHeight;
  }, [chat.messages.length, ai.text, ai.status, ai.toolCalls.length]);

  function handleScroll() {
    const log = logRef.current;
    pinned.current = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    } else if (event.key === 'Escape' && ai.busy) {
      event.stopPropagation();
      ai.stop();
    }
  }

  const empty = chat.messages.length === 0 && !ai.busy;
  return (
    <div className="assistant">
      <div className="assistant-log" ref={logRef} onScroll={handleScroll} role="log" aria-label="Conversation with Claude">
        {empty && (
          <div className="assistant-intro">
            <p>
              Ask about your day, or tell Claude what to change: add or move tasks, put things in the calendar, tick off
              habits. Nothing changes until you press Apply.
            </p>
            <ul className="assistant-starters">
              {STARTERS.map((text) => (
                <li key={text}>
                  <button type="button" onClick={() => send(text)}>
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {chat.messages.map((message, index) =>
          message.role === 'user' ? (
            <UserTurn key={index} message={message} />
          ) : (
            <Reply key={index} message={message} assistant={assistant} facts={facts} />
          )
        )}
        {ai.busy && (
          <div className="assistant-turn" aria-busy="true">
            <p className="assistant-who label">Claude</p>
            {ai.text && <p className="assistant-text">{ai.text}</p>}
            <p className="assistant-working">{WORKING[ai.status]}</p>
          </div>
        )}
        {ai.status === 'refused' && <p className="assistant-note">Claude declined to answer that one.</p>}
      </div>

      {ai.status === 'error' && (
        <p className="assistant-error" role="alert">
          Couldn’t send: {ai.error}
        </p>
      )}
      <form
        className="assistant-compose"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor={`${id}-input`} className="visually-hidden">
          Message Claude
        </label>
        <textarea
          id={`${id}-input`}
          ref={inputRef}
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask, or say what to change…"
          enterKeyHint="send"
        />
        {ai.busy ? (
          <button type="button" className="assistant-send" onClick={ai.stop}>
            Stop
          </button>
        ) : (
          <button type="submit" className="assistant-send" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>
      <div className="assistant-foot">
        <span className="label">Enter sends · Shift+Enter for a new line</span>
        <button type="button" className="assistant-clear" onClick={assistant.clear} disabled={!chat.messages.length || ai.busy}>
          Clear chat
        </button>
      </div>
    </div>
  );
}

function UserTurn({ message }) {
  return (
    <div className="assistant-turn is-user">
      {isRecap(message) && <p className="assistant-recap label">Earlier messages, summarised</p>}
      <p className="assistant-who label">You</p>
      <p className="assistant-text">{questionOf(message)}</p>
    </div>
  );
}

// One reply: what Claude wrote, then a card for each change it proposed.
function Reply({ message, assistant, facts }) {
  const text = replyText(message);
  const proposals = message.content.filter((block) => block.type === 'tool_use' && assistant.chat.actions[block.id]);
  const pending = proposals.filter((block) => assistant.chat.actions[block.id].status === 'pending').map((block) => block.id);
  return (
    <div className="assistant-turn">
      <p className="assistant-who label">Claude</p>
      {text && <p className="assistant-text">{text}</p>}
      {proposals.length > 0 && (
        <ul className="assistant-cards">
          {proposals.map((block) => (
            <Proposal key={block.id} id={block.id} action={assistant.chat.actions[block.id]} assistant={assistant} facts={facts} />
          ))}
        </ul>
      )}
      {pending.length > 1 && (
        <div className="assistant-all">
          <button type="button" className="assistant-apply" onClick={() => assistant.apply(pending)}>
            Apply all {pending.length}
          </button>
          <button type="button" onClick={() => assistant.dismiss(pending)}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}

// A proposed change: what it would do, and Apply or Dismiss; once settled, what became of it.
function Proposal({ id, action, assistant, facts }) {
  const spec = action.status !== 'invalid' && actionFor(action.name);
  // Once applied, the card keeps what it said then; until then it reads against things as they are.
  const { title, details } = action.shown ?? (spec ? spec.describe(action.input, facts) : { title: 'A change that couldn’t be read', details: [] });
  const titleId = `${id}-title`;
  return (
    <li className={`assistant-card is-${action.status}`} aria-labelledby={titleId}>
      <p className="assistant-card-title" id={titleId}>
        {title}
      </p>
      {details.length > 0 && (
        <ul className="assistant-card-details">
          {details.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
      <div className="assistant-card-foot">
        {action.status === 'pending' ? (
          <>
            <button type="button" className="assistant-apply" onClick={() => assistant.apply([id])} aria-label={`Apply: ${title}`}>
              Apply
            </button>
            <button type="button" onClick={() => assistant.dismiss([id])} aria-label={`Dismiss: ${title}`}>
              Dismiss
            </button>
          </>
        ) : (
          <>
            <span className="assistant-card-status label">
              {STATUS_TEXT[action.status]}
              {action.status === 'failed' && action.note ? `: ${action.note}` : ''}
            </span>
            {action.status === 'applied' && assistant.canUndo(id) && (
              <button type="button" onClick={() => assistant.undo(id)} aria-label={`Undo: ${title}`}>
                Undo
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default AssistantWidget;
