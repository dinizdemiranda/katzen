const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Incident count for a cat over the selected period, plus a comparison against the
 * equal-length period before it — mirrors the weight weekly-change indicator so
 * both graphs "read" the same way: an arrow plus a color. More incidents than
 * before is flagged red (worse), fewer is green (better).
 */
export function incidentCountTrend(events, catId, periodDays, now = new Date()) {
	const nowMs = now.getTime();
	const currentStart = nowMs - periodDays * DAY_MS;
	const previousStart = nowMs - periodDays * 2 * DAY_MS;

	const catEvents = events.filter((e) => e.cat_id === catId);
	const count = catEvents.filter((e) => new Date(e.created_at).getTime() >= currentStart).length;
	const previousCount = catEvents.filter((e) => {
		const t = new Date(e.created_at).getTime();
		return t >= previousStart && t < currentStart;
	}).length;

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
