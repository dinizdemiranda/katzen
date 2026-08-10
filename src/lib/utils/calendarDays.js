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

/** All days in a given month, plus leading blanks to align the 1st under its weekday. */
export function buildMonthGrid(year, month) {
	const firstDay = new Date(year, month, 1);
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
	return { days, leadingPad: firstDay.getDay() };
}

/** The distinct {year, month} pairs touched by a list of dates, oldest first. */
export function monthsInRange(days) {
	const seen = new Set();
	const months = [];
	for (const d of days) {
		const key = `${d.getFullYear()}-${d.getMonth()}`;
		if (!seen.has(key)) {
			seen.add(key);
			months.push({ year: d.getFullYear(), month: d.getMonth() });
		}
	}
	return months;
}
