import { useRef, useState } from 'react';
import './BoardTabs.css';

export const tabId = (boardId) => `board-tab-${boardId}`;

// The row of boards under the masthead, following the ARIA tabs pattern: the arrow keys (and
// Home and End) move between boards and show them, Tab moves on to the board itself.
// Double-click a board, or press F2 on it, to rename it.
//   boards: [{ id, name }]     activeId     panelId: the id of the element the boards fill
//   onSwitch(id)  onAdd()  onRename(id, name)  onDelete(id)
function BoardTabs({ boards, activeId, panelId, onSwitch, onAdd, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(null); // the id of the board being renamed
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);
  const active = boards.find((board) => board.id === activeId) ?? boards[0];

  function startRename(board) {
    setDraft(board.name);
    cancelled.current = false;
    setRenaming(board.id);
  }

  function finishRename() {
    if (!cancelled.current) onRename(renaming, draft);
    const id = renaming;
    setRenaming(null);
    // Back to the tab, so the keyboard user carries on from where they were.
    requestAnimationFrame(() => document.getElementById(tabId(id))?.focus());
  }

  function handleTabKeyDown(event, index) {
    const last = boards.length - 1;
    const moves = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last };
    if (event.key in moves) {
      event.preventDefault();
      const next = boards[moves[event.key]];
      onSwitch(next.id);
      document.getElementById(tabId(next.id))?.focus();
    } else if (event.key === 'F2') {
      event.preventDefault();
      startRename(boards[index]);
    }
  }

  return (
    <nav className="board-bar" aria-label="Boards">
      <div className="board-tabs" role="tablist" aria-label="Boards">
        {boards.map((board, index) =>
          renaming === board.id ? (
            <input
              key={board.id}
              className="board-rename"
              type="text"
              value={draft}
              aria-label={`Rename board ${board.name}`}
              maxLength={40}
              size={Math.max(draft.length, 4)}
              autoFocus
              onFocus={(event) => event.target.select()}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.stopPropagation(); // don't also close whatever is open behind
                  cancelled.current = true;
                  event.currentTarget.blur();
                }
              }}
              onBlur={finishRename}
            />
          ) : (
            <button
              key={board.id}
              id={tabId(board.id)}
              type="button"
              role="tab"
              className="board-tab"
              aria-selected={board.id === active.id}
              aria-controls={panelId}
              tabIndex={board.id === active.id ? 0 : -1}
              title={index < 9 ? `${board.name} (press ${index + 1})` : board.name}
              onClick={() => onSwitch(board.id)}
              onDoubleClick={() => startRename(board)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {board.name}
            </button>
          )
        )}
      </div>
      <button type="button" className="board-action board-add" aria-label="New board" title="New board" onClick={onAdd}>
        +
      </button>
      <div className="board-actions">
        <button type="button" className="board-action" onClick={() => startRename(active)}>
          Rename
        </button>
        {boards.length > 1 && (
          <button
            type="button"
            className="board-action"
            aria-label={`Delete board ${active.name}`}
            onClick={() => onDelete(active.id)}
          >
            Delete
          </button>
        )}
      </div>
    </nav>
  );
}

export default BoardTabs;
