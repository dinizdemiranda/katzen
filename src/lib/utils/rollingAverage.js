const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Turns raw weigh-ins (ascending or not, single cat) into a smoothed series where
 * each point is the average of that cat's readings from the trailing 7 days,
 * so single noisy weigh-ins don't whipsaw the graph.
 */
export function sevenDayAverageSeries(weighIns) {
	const sorted = [...weighIns].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
	return sorted.map((entry, i) => {
		const t = new Date(entry.created_at).getTime();
		const windowStart = t - SEVEN_DAYS_MS;
		const window = sorted
			.slice(0, i + 1)
			.filter((w) => new Date(w.created_at).getTime() >= windowStart);
		const avg = window.reduce((sum, w) => sum + Number(w.weight), 0) / window.length;
		return { date: entry.created_at, value: avg };
	});
}

/** Change from the first to the last point of a smoothed series, or null if not enough data. */
export function seriesDelta(series) {
	if (series.length < 2) return null;
	return series[series.length - 1].value - series[0].value;
}
