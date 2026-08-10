// Fixed palette assigned to cats in order, so each cat keeps a stable color across
// the app (graphs, avatars, etc). Chosen for contrast against both light and dark UI.
export const CAT_COLOR_PALETTE = [
	'#ef6c5d', // coral
	'#4d8dd9', // blue
	'#5fb88a', // green
	'#e0a63b', // amber
	'#9b7fd4', // violet
	'#3fb0b0', // teal
	'#d96fa8', // pink
	'#8a9a4d' // olive
];

export function nextCatColor(existingCats) {
	const used = new Set(existingCats.map((cat) => cat.color));
	const free = CAT_COLOR_PALETTE.find((color) => !used.has(color));
	if (free) return free;
	// Palette exhausted: cycle by index so colors still differ from most neighbors.
	return CAT_COLOR_PALETTE[existingCats.length % CAT_COLOR_PALETTE.length];
}
