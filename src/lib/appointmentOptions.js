export const APPOINTMENT_TYPES = [
	{ key: 'vet_visit', label: 'Vet visit' },
	{ key: 'clinical_exam', label: 'Clinical Exam' },
	{ key: 'procedure', label: 'Procedure' },
	{ key: 'emergency', label: 'Emergency' }
];

export function appointmentTypeLabel(type) {
	return APPOINTMENT_TYPES.find((t) => t.key === type)?.label ?? type;
}
