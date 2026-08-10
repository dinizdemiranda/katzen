/** Formats a Date as a "YYYY-MM-DDTHH:mm" string in local time, for <input type="datetime-local">. */
export function toDatetimeLocalValue(date) {
	const offsetMs = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
