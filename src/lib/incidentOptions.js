// Built-in incident types. Fixed in the app (not stored in the DB) — households can
// add their own on top of these via the incident_types table.
export const BUILTIN_INCIDENT_TYPES = [
	{ key: 'puke', label: 'Puke', emoji: '🤮' },
	{ key: 'litter_box', label: 'Litter box', emoji: '💩' },
	{ key: 'coughing', label: 'Coughing', emoji: '😷' },
	{ key: 'seizure', label: 'Seizure', emoji: '🤒' }
];

export const BUILTIN_INCIDENT_KEYS = BUILTIN_INCIDENT_TYPES.map((t) => t.key);

/** { label, emoji } for an incident row. Custom types have no emoji. */
export function incidentTypeInfo(incident, customTypes = []) {
	if (incident.type === 'custom') {
		const custom = customTypes.find((t) => t.id === incident.custom_type_id);
		return { label: custom?.label ?? 'Custom', emoji: null };
	}
	const builtin = BUILTIN_INCIDENT_TYPES.find((t) => t.key === incident.type);
	return { label: builtin?.label ?? incident.type, emoji: builtin?.emoji ?? null };
}

export const CONTENT_OPTIONS = [
	{ value: 'food', label: 'Food' },
	{ value: 'foam_bile', label: 'Foam/Bile' },
	{ value: 'fur', label: 'Fur' },
	{ value: 'liquid', label: 'Liquid' },
	{ value: 'mixed', label: 'Mixed' },
	{ value: 'other', label: 'Other' }
];

export const AMOUNT_OPTIONS = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' }
];

export const TIMING_OPTIONS = [
	{ value: 'right_after_eating', label: 'Right after eating' },
	{ value: 'fasting', label: 'Fasting' },
	{ value: 'unknown', label: 'Unknown' }
];

export const APPETITE_OPTIONS = [
	{ value: 'normal', label: 'Normal' },
	{ value: 'reduced', label: 'Reduced' },
	{ value: 'not_eating', label: 'Not eating' }
];

export const ENERGY_OPTIONS = [
	{ value: 'normal', label: 'Normal' },
	{ value: 'low', label: 'Low' },
	{ value: 'very_low', label: 'Very low' }
];

function toLabelMap(options) {
	return Object.fromEntries(options.map((o) => [o.value, o.label]));
}

const CONTENT_LABELS = toLabelMap(CONTENT_OPTIONS);
const AMOUNT_LABELS = toLabelMap(AMOUNT_OPTIONS);
const TIMING_LABELS = toLabelMap(TIMING_OPTIONS);
const APPETITE_LABELS = toLabelMap(APPETITE_OPTIONS);
const ENERGY_LABELS = toLabelMap(ENERGY_OPTIONS);

export function contentLabel(value) {
	return CONTENT_LABELS[value] ?? value;
}

export function amountLabel(value) {
	return AMOUNT_LABELS[value] ?? value;
}

export function timingLabel(value) {
	return TIMING_LABELS[value] ?? value;
}

export function appetiteLabel(value) {
	return APPETITE_LABELS[value] ?? value;
}

export function energyLabel(value) {
	return ENERGY_LABELS[value] ?? value;
}
