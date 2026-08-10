import { supabase } from '$lib/supabaseClient';
import { getProfile } from '$lib/api/profiles';
import { ensureLitterMembership, getLitter } from '$lib/api/litters';
import { listCats } from '$lib/api/cats';

export const auth = $state({
	session: null,
	profile: null,
	ready: false
});

export const litterState = $state({
	litter: null,
	cats: [],
	ready: false,
	error: null
});

let initialized = false;
// Guards against getSession() and the immediate onAuthStateChange('INITIAL_SESSION') firing
// concurrently for the same user, which would otherwise race two litter-creation attempts.
let inFlightUserId = null;

export function initAuth() {
	if (initialized) return;
	initialized = true;

	supabase.auth.getSession().then(({ data }) => {
		handleSessionChange(data.session);
	});

	supabase.auth.onAuthStateChange((_event, session) => {
		handleSessionChange(session);
	});
}

async function handleSessionChange(session) {
	auth.session = session;

	if (!session) {
		inFlightUserId = null;
		auth.profile = null;
		auth.ready = true;
		litterState.litter = null;
		litterState.cats = [];
		litterState.ready = true;
		litterState.error = null;
		return;
	}

	if (inFlightUserId === session.user.id) return;
	inFlightUserId = session.user.id;

	try {
		auth.profile = await getProfile(session.user.id);
	} catch (e) {
		console.error('Failed to load profile', e);
	} finally {
		auth.ready = true;
	}

	await loadLitter();
}

export async function loadLitter() {
	if (!auth.session) return;
	litterState.ready = false;
	litterState.error = null;
	try {
		const litterId = await ensureLitterMembership(auth.session.user.id, auth.session.user.email);
		litterState.litter = await getLitter(litterId);
		litterState.cats = await listCats(litterId);
	} catch (e) {
		console.error('Failed to load litter', e);
		litterState.error = e.message ?? 'Something went wrong loading your household.';
	} finally {
		litterState.ready = true;
	}
}

export async function refreshCats() {
	if (!litterState.litter) return;
	litterState.cats = await listCats(litterState.litter.id);
}
