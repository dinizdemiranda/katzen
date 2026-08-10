export const toasts = $state([]);

let nextId = 0;

export function showToast(message, type = 'success', duration = 3000) {
	const id = ++nextId;
	toasts.push({ id, message, type });
	setTimeout(() => dismissToast(id), duration);
	return id;
}

export function dismissToast(id) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) toasts.splice(index, 1);
}
