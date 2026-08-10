export const CONTENT_OPTIONS = [
	{ value: 'food', label: 'Food' },
	{ value: 'foam_bile', label: 'Foam/Bile' },
	{ value: 'fur', label: 'Fur' },
	{ value: 'liquid', label: 'Liquid' },
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
