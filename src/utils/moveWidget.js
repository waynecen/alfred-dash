// Moves the widget id `fromId` to where `toId` is now. Returns the same list if nothing moves.
function moveWidget(ids, fromId, toId) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1 || from === to) return ids;

  const result = [...ids];
  result.splice(from, 1);
  result.splice(to, 0, fromId);
  return result;
}

export default moveWidget;
