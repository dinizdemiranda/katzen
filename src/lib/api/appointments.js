import { supabase } from '$lib/supabaseClient';

/** All appointments for every cat in a litter (for the dashboard calendar), with
 *  their documents embedded, most recently scheduled first. */
export async function listAllAppointments(litterId) {
	const { data, error } = await supabase
		.from('appointments')
		.select('*, appointment_documents(*), cats!inner(id, name, color, litter_id)')
		.eq('cats.litter_id', litterId)
		.order('scheduled_at', { ascending: false });
	if (error) throw error;
	return data;
}

/** Full appointment history for one cat, with documents embedded. */
export async function listAppointmentsForCat(catId) {
	const { data, error } = await supabase
		.from('appointments')
		.select('*, appointment_documents(*)')
		.eq('cat_id', catId)
		.order('scheduled_at', { ascending: false });
	if (error) throw error;
	return data;
}

export async function createAppointment({ catId, title, type, scheduledAt, address, notes, userId }) {
	const { data, error } = await supabase
		.from('appointments')
		.insert({
			cat_id: catId,
			title,
			type,
			scheduled_at: scheduledAt,
			address: address || null,
			notes: notes || null,
			created_by: userId
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateAppointment(id, { title, type, scheduledAt, address, notes }) {
	const { data, error } = await supabase
		.from('appointments')
		.update({
			title,
			type,
			scheduled_at: scheduledAt,
			address: address || null,
			notes: notes || null
		})
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteAppointment(id) {
	const { error } = await supabase.from('appointments').delete().eq('id', id);
	if (error) throw error;
}

/** Uploads an appointment document and returns its public URL. Path is
 *  "<litterId>/<catId>/<file>", matching the other storage RLS patterns. */
export async function uploadAppointmentDocument(litterId, catId, file) {
	const ext = file.name.split('.').pop();
	const path = `${litterId}/${catId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from('appointment-documents')
		.upload(path, file);
	if (uploadError) throw uploadError;

	const { data } = supabase.storage.from('appointment-documents').getPublicUrl(path);
	return data.publicUrl;
}

export async function addAppointmentDocument(appointmentId, fileUrl, fileName) {
	const { data, error } = await supabase
		.from('appointment_documents')
		.insert({ appointment_id: appointmentId, file_url: fileUrl, file_name: fileName })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteAppointmentDocument(id) {
	const { error } = await supabase.from('appointment_documents').delete().eq('id', id);
	if (error) throw error;
}
