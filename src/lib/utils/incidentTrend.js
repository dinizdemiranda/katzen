function countInMonth(events, year, month) {
	return events.filter((e) => {
		const d = new Date(e.created_at);
		return d.getFullYear() === year && d.getMonth() === month;
	}).length;
}

/**
 * Incident count for a cat in the given calendar month, plus a comparison against the
 * previous month — mirrors the weight weekly-change indicator so both "read" the same
 * way: an arrow plus a color. More incidents than before is flagged red (worse), fewer
 * is green (better).
 */
export function monthIncidentTrend(events, catId, year, month) {
	const catEvents = events.filter((e) => e.cat_id === catId);
	const count = countInMonth(catEvents, year, month);
	const prevYear = month === 0 ? year - 1 : year;
	const prevMonth = month === 0 ? 11 : month - 1;
	const previousCount = countInMonth(catEvents, prevYear, prevMonth);

	const diff = count - previousCount;
	let cls = 'flat';
	let arrow = '→';
	if (diff > 0) {
		cls = 'up';
		arrow = '↑';
	} else if (diff < 0) {
		cls = 'down';
		arrow = '↓';
	}

	return { count, diff, arrow, cls };
}
