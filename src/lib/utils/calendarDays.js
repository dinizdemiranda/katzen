/** Local YYYY-MM-DD key, used to group events by calendar day regardless of time-of-day. */
export function dayKey(date) {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * A full-weeks grid for the given month: the month's own days plus enough leading days
 * from the previous month and trailing days from the next to fill out whole weeks (so a
 * month starting on a Saturday doesn't leave a mostly-empty first row), each flagged with
 * whether it belongs to the requested month.
 */
export function buildMonthGrid(year, month) {
	const firstDay = new Date(year, month, 1);
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const leadingCount = firstDay.getDay();

	const leading = Array.from({ length: leadingCount }, (_, i) => ({
		date: new Date(year, month, i - leadingCount + 1),
		inCurrentMonth: false
	}));
	const current = Array.from({ length: daysInMonth }, (_, i) => ({
		date: new Date(year, month, i + 1),
		inCurrentMonth: true
	}));
	const trailingCount = (7 - ((leading.length + current.length) % 7)) % 7;
	const trailing = Array.from({ length: trailingCount }, (_, i) => ({
		date: new Date(year, month, daysInMonth + i + 1),
		inCurrentMonth: false
	}));

	return { days: [...leading, ...current, ...trailing] };
}
