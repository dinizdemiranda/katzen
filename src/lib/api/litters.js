import { supabase } from '$lib/supabaseClient';

/**
 * Figures out which litter a user belongs to, joining/creating one as needed:
 * 1. Already a member of a litter -> use it.
 * 2. Has a pending invite (by email) -> accept it and join that litter.
 * 3. Otherwise -> create a fresh litter and become its owner.
 * Returns the litter id.
 */
export async function ensureLitterMembership(userId, email) {
	const { data: membership, error: membershipError } = await supabase
		.from('litter_members')
		.select('litter_id')
		.eq('user_id', userId)
		.limit(1)
		.maybeSingle();
	if (membershipError) throw membershipError;
	if (membership) return membership.litter_id;

	const { data: invite, error: inviteError } = await supabase
		.from('litter_invites')
		.select('id, litter_id')
		.eq('email', email)
		.eq('status', 'pending')
		.limit(1)
		.maybeSingle();
	if (inviteError) throw inviteError;

	if (invite) {
		const { error: joinError } = await supabase
			.from('litter_members')
			.insert({ litter_id: invite.litter_id, user_id: userId, role: 'member' });
		if (joinError) throw joinError;

		await supabase.from('litter_invites').update({ status: 'accepted' }).eq('id', invite.id);

		return invite.litter_id;
	}

	// Insert without .select(): RETURNING is filtered by the SELECT policy, which requires
	// litter membership — but that membership row doesn't exist until the next insert below.
	// Generating the id client-side sidesteps that chicken-and-egg RLS timing issue.
	const newLitterId = crypto.randomUUID();
	const { error: litterError } = await supabase
		.from('litters')
		.insert({ id: newLitterId, name: 'My Household' });
	if (litterError) throw litterError;

	const { error: ownerError } = await supabase
		.from('litter_members')
		.insert({ litter_id: newLitterId, user_id: userId, role: 'owner' });
	if (ownerError) throw ownerError;

	return newLitterId;
}

export async function getLitter(litterId) {
	const { data, error } = await supabase.from('litters').select('*').eq('id', litterId).single();
	if (error) throw error;
	return data;
}

export async function updateLitterName(litterId, name) {
	const { data, error } = await supabase
		.from('litters')
		.update({ name })
		.eq('id', litterId)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function getMembers(litterId) {
	const { data, error } = await supabase
		.from('litter_members')
		.select('user_id, role, joined_at, profiles(id, name, email)')
		.eq('litter_id', litterId)
		.order('joined_at');
	if (error) throw error;
	return data;
}

export async function getPendingInvites(litterId) {
	const { data, error } = await supabase
		.from('litter_invites')
		.select('*')
		.eq('litter_id', litterId)
		.eq('status', 'pending')
		.order('created_at');
	if (error) throw error;
	return data;
}

export async function inviteMember(litterId, email, invitedBy) {
	const { data, error } = await supabase
		.from('litter_invites')
		.insert({ litter_id: litterId, email: email.trim().toLowerCase(), invited_by: invitedBy })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function revokeInvite(inviteId) {
	const { error } = await supabase.from('litter_invites').delete().eq('id', inviteId);
	if (error) throw error;
}

export async function removeMember(litterId, userId) {
	const { error } = await supabase
		.from('litter_members')
		.delete()
		.eq('litter_id', litterId)
		.eq('user_id', userId);
	if (error) throw error;
}
