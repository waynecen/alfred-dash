import './EditorActions.css';

// The foot of an inline editor: Save (the form's submit) and Cancel, then quieter actions set
// apart at the end, such as Archive or Delete. Give a quiet action className="editor-quiet",
// and one that destroys something "editor-quiet editor-danger": it turns red on hover and
// focus, the one place colour warns.
//   onCancel()    children: the quiet actions
function EditorActions({ onCancel, children }) {
  return (
    <div className="editor-actions">
      <button type="submit" className="editor-save">
        Save
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {children && <span className="editor-spacer" />}
      {children}
    </div>
  );
}

export default EditorActions;
