import { useRef, useState } from 'react';
import { refreshStorage } from '../../hooks/useLocalStorage';
import { readAll } from '../../data/migrate';
import {
  downloadBackup,
  parseBackup,
  restoreData,
  clearData,
  storageUsed,
  formatBytes,
} from '../../data/backup';
import { plural } from '../../utils/text';

// What a backup holds, in a few words: "12 tasks, notes, 2 boards".
function describe(data) {
  const parts = [];
  if (Array.isArray(data.tasks)) parts.push(plural(data.tasks.length, 'task'));
  if (Array.isArray(data.events) && data.events.length > 0) {
    parts.push(plural(data.events.length, 'event'));
  }
  if (data.notes) parts.push('notes');
  if (Array.isArray(data.boards)) parts.push(plural(data.boards.length, 'board'));
  return parts.length > 0 ? parts.join(', ') : 'no tasks or notes';
}

const formatWhen = (ms) =>
  new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Settings › Data: back everything up to a file, restore from one, or start over.
// Restoring and clearing both replace what is saved, so each asks first and then offers Undo.
//   notify: shows a toast (from useToasts)
function DataSection({ notify }) {
  const fileRef = useRef(null);
  // null, { kind: 'restore', backup } or { kind: 'clear' }: the step waiting for a yes or no.
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  // Swaps what is saved for `data`, then offers to put the old data back.
  function replaceWith(data, message) {
    const previous = readAll();
    try {
      if (data) restoreData(data);
      else clearData();
    } catch {
      // Storage refused part of it: put back what was there rather than leave half a backup.
      try {
        restoreData(previous);
      } catch {
        // Nothing more we can do; the page still shows what it had.
      }
      refreshStorage();
      setPending(null);
      setError('The browser’s storage is full, so the backup could not be restored.');
      return;
    }
    refreshStorage();
    setPending(null);
    setError(null);
    notify({
      message,
      actionLabel: 'Undo',
      onAction: () => {
        restoreData(previous);
        refreshStorage();
      },
    });
  }

  function exportBackup() {
    downloadBackup();
    notify({ message: 'Backup saved to your downloads' });
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // so picking the same file again still counts as a change
    if (!file) return;
    setError(null);
    const result = parseBackup(await file.text());
    if (result.ok) setPending({ kind: 'restore', backup: result.backup });
    else setError(result.error);
  }

  return (
    <section className="drawer-section">
      <h3>Data</h3>
      <p className="drawer-note">
        Everything is saved in this browser only ({formatBytes(storageUsed())}). Save a backup to keep it
        safe or move it to another browser.
      </p>

      {pending?.kind === 'restore' && (
        <div className="drawer-confirm" role="group" aria-label="Restore backup">
          <p>
            Replace everything with this backup
            {pending.backup.exportedAt ? ` from ${formatWhen(pending.backup.exportedAt)}` : ''} (
            {describe(pending.backup.data)})?
          </p>
          <div className="drawer-actions">
            <button type="button" onClick={() => replaceWith(pending.backup.data, 'Backup restored')}>
              Replace
            </button>
            {/* The safe choice takes focus, so Enter can't replace data by accident. */}
            <button type="button" autoFocus onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pending?.kind === 'clear' && (
        <div className="drawer-confirm" role="group" aria-label="Clear all data">
          <p>Remove every task, note, widget and setting from this browser?</p>
          <div className="drawer-actions">
            <button type="button" onClick={() => replaceWith(null, 'All data cleared')}>
              Clear everything
            </button>
            <button type="button" autoFocus onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!pending && (
        <div className="drawer-actions">
          <button type="button" onClick={exportBackup}>
            Export backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Import backup…
          </button>
          <button type="button" onClick={() => setPending({ kind: 'clear' })}>
            Clear all data…
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={chooseFile}
      />
      {error && (
        <p className="drawer-note drawer-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default DataSection;
