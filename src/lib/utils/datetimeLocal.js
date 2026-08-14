/** Formats a Date as a "YYYY-MM-DDTHH:mm" string in local time, for <input type="datetime-local">. */
export function toDatetimeLocalValue(date) {
	const offsetMs = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const QUARTER_HOUR_MS = 15 * 60 * 1000;

/** Rounds a Date to the nearest 15-minute mark, to match datetime-local's step="900". */
export function roundToQuarterHour(date) {
	return new Date(Math.round(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
}

/** Rounds a Date up to the next 15-minute mark. */
export function ceilToQuarterHour(date) {
	return new Date(Math.ceil(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
}
