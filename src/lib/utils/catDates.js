export function formatBirthday(birthday) {
	if (!birthday) return 'Unknown birthday';
	return new Date(`${birthday}T00:00:00`).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export function formatAge(birthday) {
	if (!birthday) return '';
	const birth = new Date(`${birthday}T00:00:00`);
	const now = new Date();
	let years = now.getFullYear() - birth.getFullYear();
	let months = now.getMonth() - birth.getMonth();
	if (now.getDate() < birth.getDate()) months -= 1;
	if (months < 0) {
		years -= 1;
		months += 12;
	}
	if (years <= 0) return `${months} mo`;
	return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}
