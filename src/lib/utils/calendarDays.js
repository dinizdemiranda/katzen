/** Local YYYY-MM-DD key, used to group events by calendar day regardless of time-of-day. */
export function dayKey(date) {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * The last `count` days (default 30) ending today, plus leading blank cells so the
 * first day lines up under its correct weekday in a 7-column calendar grid.
 */
export function buildTrailingCalendar(count = 30, today = new Date()) {
	const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	start.setDate(start.getDate() - (count - 1));

	const days = Array.from({ length: count }, (_, i) => {
		const d = new Date(start);
		d.setDate(d.getDate() + i);
		return d;
	});

	return { days, leadingPad: days[0].getDay() };
}
