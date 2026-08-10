import { supabase } from '$lib/supabaseClient';
import { getInitials } from '$lib/utils/initials.js';

export async function getProfile(userId) {
	const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
	if (error) throw error;
	return data;
}

export async function updateProfile(userId, fields) {
	const { data, error } = await supabase
		.from('profiles')
		.update(fields)
		.eq('id', userId)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export function initials(name, email) {
	const source = (name || '').trim() || (email || '').split('@')[0];
	return getInitials(source);
}
