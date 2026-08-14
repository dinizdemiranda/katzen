import { supabase } from '$lib/supabaseClient';

/** All incidents for every cat in a litter, most recent first. */
export async function listIncidents(litterId) {
	const { data, error } = await supabase
		.from('incidents')
		.select('*, cats!inner(id, name, color, litter_id)')
		.eq('cats.litter_id', litterId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

export async function addIncident({
	catId,
	type,
	customTypeId,
	notes,
	userId,
	occurredAt,
	content,
	amount,
	timing,
	appetite,
	energyLevel,
	diarrhea,
	blood,
	urineChanges,
	photoUrl
}) {
	const { data, error } = await supabase
		.from('incidents')
		.insert({
			cat_id: catId,
			type,
			custom_type_id: customTypeId || null,
			notes: notes || null,
			created_by: userId,
			created_at: occurredAt,
			content: content || null,
			amount: amount || null,
			timing: timing || null,
			appetite,
			energy_level: energyLevel,
			diarrhea,
			blood,
			urine_changes: urineChanges,
			photo_url: photoUrl || null
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

/** Most recent incidents for one cat. */
export async function listIncidentsForCat(catId, limit = 5) {
	const { data, error } = await supabase
		.from('incidents')
		.select('*')
		.eq('cat_id', catId)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) throw error;
	return data;
}

export async function updateIncident(
	id,
	{
		type,
		customTypeId,
		occurredAt,
		content,
		amount,
		timing,
		appetite,
		energyLevel,
		diarrhea,
		blood,
		urineChanges,
		notes,
		photoUrl
	}
) {
	const { data, error } = await supabase
		.from('incidents')
		.update({
			type,
			custom_type_id: customTypeId || null,
			created_at: occurredAt,
			content: content || null,
			amount: amount || null,
			timing: timing || null,
			appetite,
			energy_level: energyLevel,
			diarrhea,
			blood,
			urine_changes: urineChanges,
			notes: notes || null,
			photo_url: photoUrl ?? null
		})
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteIncident(id) {
	const { error } = await supabase.from('incidents').delete().eq('id', id);
	if (error) throw error;
}

/** Uploads an incident photo and returns its public URL. Path is
 *  "<litterId>/<catId>/<file>", matching the cat-photos storage RLS pattern. */
export async function uploadIncidentPhoto(litterId, catId, file) {
	const ext = file.name.split('.').pop();
	const path = `${litterId}/${catId}/${Date.now()}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from('puke-photos')
		.upload(path, file, { upsert: true });
	if (uploadError) throw uploadError;

	const { data } = supabase.storage.from('puke-photos').getPublicUrl(path);
	return data.publicUrl;
}

/** Custom incident types a household has added, oldest first. */
export async function listIncidentTypes(litterId) {
	const { data, error } = await supabase
		.from('incident_types')
		.select('*')
		.eq('litter_id', litterId)
		.order('created_at');
	if (error) throw error;
	return data;
}

export async function createIncidentType(litterId, label) {
	const { data, error } = await supabase
		.from('incident_types')
		.insert({ litter_id: litterId, label })
		.select()
		.single();
	if (error) throw error;
	return data;
}
