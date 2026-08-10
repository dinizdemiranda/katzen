import { supabase } from '$lib/supabaseClient';
import { nextCatColor } from '$lib/utils/colors';

/** Real, manageable cats only — excludes the standing "Unknown" cat. */
export async function listCats(litterId) {
	const { data, error } = await supabase
		.from('cats')
		.select('*')
		.eq('litter_id', litterId)
		.eq('is_unknown', false)
		.order('created_at');
	if (error) throw error;
	return data;
}

/** Real cats plus the "Unknown" cat, for contexts where "not sure which cat" is valid
 *  (vomit logging). "Unknown" is always sorted first, so it's the default selection. */
export async function listVomitCats(litterId) {
	const { data, error } = await supabase
		.from('cats')
		.select('*')
		.eq('litter_id', litterId)
		.order('is_unknown', { ascending: false })
		.order('created_at');
	if (error) throw error;
	return data;
}

export async function createCat(litterId, { name, birthday, gender, microchipNumber }) {
	const existing = await listCats(litterId);
	const color = nextCatColor(existing);
	const { data, error } = await supabase
		.from('cats')
		.insert({
			litter_id: litterId,
			name,
			birthday: birthday || null,
			gender: gender || null,
			microchip_number: microchipNumber || null,
			color
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateCat(catId, fields) {
	const { data, error } = await supabase
		.from('cats')
		.update(fields)
		.eq('id', catId)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteCat(catId) {
	const { error } = await supabase.from('cats').delete().eq('id', catId);
	if (error) throw error;
}

/** Uploads a cat photo and returns its public URL. Path is "<litterId>/<catId>/<file>",
 *  which the storage RLS policies use to enforce litter membership. */
export async function uploadCatPhoto(litterId, catId, file) {
	const ext = file.name.split('.').pop();
	const path = `${litterId}/${catId}/${Date.now()}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from('cat-photos')
		.upload(path, file, { upsert: true });
	if (uploadError) throw uploadError;

	const { data } = supabase.storage.from('cat-photos').getPublicUrl(path);
	return data.publicUrl;
}
