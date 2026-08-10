import { supabase } from '$lib/supabaseClient';

/** All weigh-ins for every cat in a litter, most recent first. */
export async function listWeighIns(litterId) {
	const { data, error } = await supabase
		.from('weigh_ins')
		.select('*, cats!inner(id, name, color, litter_id)')
		.eq('cats.litter_id', litterId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

/** Full weigh-in history for one cat, most recent first. */
export async function listWeighInsForCat(catId) {
	const { data, error } = await supabase
		.from('weigh_ins')
		.select('*')
		.eq('cat_id', catId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

export async function addWeighIn({
	catId,
	method,
	weight,
	personWeight,
	personCatWeight,
	userId,
	occurredAt,
	notes
}) {
	const computedWeight = method === 'delta' ? personCatWeight - personWeight : weight;

	const { data, error } = await supabase
		.from('weigh_ins')
		.insert({
			cat_id: catId,
			method,
			weight: computedWeight,
			person_weight: method === 'delta' ? personWeight : null,
			person_cat_weight: method === 'delta' ? personCatWeight : null,
			notes: notes?.trim() || null,
			created_by: userId,
			created_at: occurredAt
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateWeighIn(
	id,
	{ method, weight, personWeight, personCatWeight, occurredAt, notes }
) {
	const computedWeight = method === 'delta' ? personCatWeight - personWeight : weight;

	const { data, error } = await supabase
		.from('weigh_ins')
		.update({
			method,
			weight: computedWeight,
			person_weight: method === 'delta' ? personWeight : null,
			person_cat_weight: method === 'delta' ? personCatWeight : null,
			notes: notes?.trim() || null,
			created_at: occurredAt
		})
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteWeighIn(id) {
	const { error } = await supabase.from('weigh_ins').delete().eq('id', id);
	if (error) throw error;
}
