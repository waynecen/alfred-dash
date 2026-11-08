// A new record's id: the time now, or one past the highest id taken if that is later (two
// records made in the same millisecond, or a clock set back). Ids are numbers that sort by age,
// and are never reused.
const nextId = (items, now = Date.now()) => Math.max(now, ...items.map((item) => item.id + 1));

export default nextId;
