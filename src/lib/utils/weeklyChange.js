const DAY_MS = 24 * 60 * 60 * 1000;

function average(entries) {
	if (entries.length === 0) return null;
	return entries.reduce((sum, w) => sum + Number(w.weight), 0) / entries.length;
}

/**
 * Compares the average weight over the last 7 days against the 7 days before that,
 * anchored on `now` (not on the last weigh-in), so the stat reflects "how is this
 * week going" rather than "how did the streak of readings trend".
 */
export function weeklyAverageChange(weighIns, now = new Date()) {
	const nowMs = now.getTime();
	const currentStart = nowMs - 7 * DAY_MS;
	const previousStart = nowMs - 14 * DAY_MS;

	const currentEntries = weighIns.filter((w) => {
		const t = new Date(w.created_at).getTime();
		return t > currentStart && t <= nowMs;
	});
	const previousEntries = weighIns.filter((w) => {
		const t = new Date(w.created_at).getTime();
		return t > previousStart && t <= currentStart;
	});

	const currentAvg = average(currentEntries);
	const previousAvg = average(previousEntries);

	if (currentAvg === null || previousAvg === null) {
		return { currentAvg, previousAvg, percentLost: null };
	}

	const percentLost = ((previousAvg - currentAvg) / previousAvg) * 100;
	return { currentAvg, previousAvg, percentLost };
}

/**
 * Maps a % lost (negative = gained) to a status the UI can color, per the vet-guidance-
 * style bands: under 0.5% is noise, 0.5-2% is a healthy loss rate, 2-2.5% is a caution
 * zone, and above 2.5%/week risks being unsafe for a cat. A gain is flagged red too,
 * just pointed the other way.
 */
export function weeklyChangeStatus(percentLost) {
	if (percentLost === null || percentLost === undefined) {
		return { color: 'gray', arrow: '—', label: 'Not enough data yet' };
	}
	if (percentLost === 0) {
		return { color: 'gray', arrow: '→', label: 'No change' };
	}
	if (percentLost < 0) {
		return { color: 'red', arrow: '↑', label: `Gained ${Math.abs(percentLost).toFixed(1)}%` };
	}
	if (percentLost < 0.5) {
		return { color: 'gray', arrow: '↓', label: `Lost ${percentLost.toFixed(1)}%` };
	}
	if (percentLost < 2) {
		return { color: 'green', arrow: '↓', label: `Lost ${percentLost.toFixed(1)}%` };
	}
	if (percentLost < 2.5) {
		return { color: 'yellow', arrow: '↓', label: `Lost ${percentLost.toFixed(1)}%` };
	}
	return { color: 'red', arrow: '↓', label: `Lost ${percentLost.toFixed(1)}%` };
}
