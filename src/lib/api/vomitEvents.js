import { supabase } from '$lib/supabaseClient';

/** All vomit events for every cat in a litter, most recent first. */
export async function listVomitEvents(litterId) {
	const { data, error } = await supabase
		.from('vomit_events')
		.select('*, cats!inner(id, name, color, litter_id)')
		.eq('cats.litter_id', litterId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

export async function addVomitEvent({
	catId,
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
	urineChanges
}) {
	const { data, error } = await supabase
		.from('vomit_events')
		.insert({
			cat_id: catId,
			notes: notes || null,
			created_by: userId,
			created_at: occurredAt,
			content,
			amount,
			timing,
			appetite,
			energy_level: energyLevel,
			diarrhea,
			blood,
			urine_changes: urineChanges
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

/** Most recent vomit events for one cat. */
export async function listVomitEventsForCat(catId, limit = 5) {
	const { data, error } = await supabase
		.from('vomit_events')
		.select('*')
		.eq('cat_id', catId)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) throw error;
	return data;
}

export async function updateVomitEvent(
	id,
	{ occurredAt, content, amount, timing, appetite, energyLevel, diarrhea, blood, urineChanges, notes }
) {
	const { data, error } = await supabase
		.from('vomit_events')
		.update({
			created_at: occurredAt,
			content,
			amount,
			timing,
			appetite,
			energy_level: energyLevel,
			diarrhea,
			blood,
			urine_changes: urineChanges,
			notes: notes || null
		})
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteVomitEvent(id) {
	const { error } = await supabase.from('vomit_events').delete().eq('id', id);
	if (error) throw error;
}
