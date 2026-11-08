import './InlineEditor.css';

// An editor that opens in place of what it edits (a habit's row, a goal's band): its fields, then
// Save and Cancel, then quieter actions set apart at the end. Enter saves; Escape cancels and goes
// no further, so it doesn't also close whatever the editor sits in.
//   onSave()    onCancel()    className: the caller's layout for its fields
//   actions: the quiet actions (Archive, Delete). Give each className="editor-quiet", and one
//     that destroys something "editor-quiet editor-danger": it turns red on hover and focus, the
//     one place colour warns.
function InlineEditor({ className, onSave, onCancel, actions, children }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSave();
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel();
  }

  return (
    <form className={className} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      {children}
      <div className="editor-actions">
        <button type="submit" className="editor-save">
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        {actions && <span className="editor-spacer" />}
        {actions}
      </div>
    </form>
  );
}

export default InlineEditor;
