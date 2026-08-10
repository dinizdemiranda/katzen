<script>
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InitialsAvatar from '$lib/components/InitialsAvatar.svelte';
	import InviteModal from '$lib/components/InviteModal.svelte';
	import { auth, litterState, loadLitter } from '$lib/state/app.svelte.js';
	import { updateLitterName, getMembers, getPendingInvites, revokeInvite, removeMember } from '$lib/api/litters.js';
	import { updateProfile, initials } from '$lib/api/profiles.js';
	import { supabase } from '$lib/supabaseClient';
	import { showToast } from '$lib/state/toast.svelte.js';

	let activeTab = $state('litter');

	let members = $state([]);
	let invites = $state([]);
	let litterNameInput = $state(litterState.litter?.name ?? '');
	let savingLitterName = $state(false);
	let litterNameError = $state('');

	let showInvite = $state(false);
	let cancelingInviteId = $state(null);
	let memberActionError = $state('');
	let kickingMemberId = $state(null);

	let nameInput = $state(auth.profile?.name ?? '');
	let savingProfile = $state(false);
	let profileError = $state('');

	let signingOut = $state(false);
	let signOutError = $state('');

	async function loadLitterTab() {
		if (!litterState.litter) return;
		litterNameInput = litterState.litter.name;
		const [m, i] = await Promise.all([
			getMembers(litterState.litter.id),
			getPendingInvites(litterState.litter.id)
		]);
		members = m;
		invites = i;
	}

	$effect(() => {
		if (litterState.ready) loadLitterTab();
	});

	async function saveLitterName(event) {
		event.preventDefault();
		savingLitterName = true;
		litterNameError = '';
		try {
			litterState.litter = await updateLitterName(litterState.litter.id, litterNameInput.trim());
			showToast('Household name saved');
		} catch (e) {
			litterNameError = e.message;
		} finally {
			savingLitterName = false;
		}
	}

	async function cancelInvite(invite) {
		cancelingInviteId = invite.id;
		memberActionError = '';
		try {
			await revokeInvite(invite.id);
			await loadLitterTab();
			showToast('Invite canceled');
		} catch (e) {
			memberActionError = e.message;
		} finally {
			cancelingInviteId = null;
		}
	}

	async function kickMember(member) {
		const isSelf = member.user_id === auth.session.user.id;
		if (isSelf) {
			if (!confirm('Leave this litter? You will lose access to its cats.')) return;
		} else if (!confirm(`Remove ${member.profiles?.name || member.profiles?.email}?`)) return;

		kickingMemberId = member.user_id;
		memberActionError = '';
		try {
			await removeMember(litterState.litter.id, member.user_id);
			if (isSelf) {
				await loadLitter();
				showToast('You left the litter');
			} else {
				await loadLitterTab();
				showToast('Member removed');
			}
		} catch (e) {
			memberActionError = e.message;
		} finally {
			kickingMemberId = null;
		}
	}

	async function saveProfile(event) {
		event.preventDefault();
		savingProfile = true;
		profileError = '';
		try {
			auth.profile = await updateProfile(auth.session.user.id, { name: nameInput.trim() });
			showToast('Profile saved');
		} catch (e) {
			profileError = e.message;
		} finally {
			savingProfile = false;
		}
	}

	async function signOut() {
		signingOut = true;
		signOutError = '';
		const { error } = await supabase.auth.signOut();
		if (error) {
			signOutError = error.message;
			signingOut = false;
		}
	}
</script>

<AppHeader title="Settings" />

<div class="settings-page">
	<div class="tabs">
		<button class:active={activeTab === 'litter'} onclick={() => (activeTab = 'litter')}>
			Litter settings
		</button>
		<button class:active={activeTab === 'user'} onclick={() => (activeTab = 'user')}>
			User settings
		</button>
	</div>

	{#if activeTab === 'litter'}
		<section class="card">
			<h2>Household name</h2>
			<form class="inline-form" onsubmit={saveLitterName}>
				<input type="text" bind:value={litterNameInput} required />
				<button type="submit" disabled={savingLitterName}>
					{savingLitterName ? 'Saving…' : 'Save'}
				</button>
			</form>
			{#if litterNameError}<p class="error">{litterNameError}</p>{/if}
		</section>

		<section class="card">
			<div class="card-header-row">
				<h2>People with access</h2>
				<button class="add-btn" onclick={() => (showInvite = true)}>+ Invite</button>
			</div>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Person</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each members as member (member.user_id)}
							<tr>
								<td>{member.profiles?.name || member.profiles?.email}</td>
								<td>{member.role === 'owner' ? 'Owner' : 'Member'}</td>
								<td class="actions-cell">
									<button
										class="remove"
										onclick={() => kickMember(member)}
										disabled={kickingMemberId === member.user_id}
									>
										{#if kickingMemberId === member.user_id}
											Working…
										{:else}
											{member.user_id === auth.session.user.id ? 'Leave' : 'Remove'}
										{/if}
									</button>
								</td>
							</tr>
						{/each}
						{#each invites as invite (invite.id)}
							<tr>
								<td class="muted">{invite.email}</td>
								<td class="muted">Pending</td>
								<td class="actions-cell">
									<button
										class="remove"
										onclick={() => cancelInvite(invite)}
										disabled={cancelingInviteId === invite.id}
									>
										{cancelingInviteId === invite.id ? 'Canceling…' : 'Cancel'}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if memberActionError}<p class="error">{memberActionError}</p>{/if}
		</section>
	{:else}
		<section class="card profile-card">
			<InitialsAvatar text={initials(nameInput, auth.session?.user.email)} size={64} />
			<form onsubmit={saveProfile}>
				<label>
					Name
					<input type="text" bind:value={nameInput} placeholder="Your name" />
				</label>
				<label>
					Email
					<input type="email" value={auth.session?.user.email ?? ''} disabled />
				</label>
				{#if profileError}<p class="error">{profileError}</p>{/if}
				<button type="submit" disabled={savingProfile}>
					{savingProfile ? 'Saving…' : 'Save'}
				</button>
			</form>
		</section>

		<button class="sign-out" onclick={signOut} disabled={signingOut}>
			{signingOut ? 'Signing out…' : 'Sign out'}
		</button>
		{#if signOutError}<p class="error center">{signOutError}</p>{/if}
	{/if}
</div>

{#if showInvite}
	<InviteModal
		litterId={litterState.litter.id}
		invitedBy={auth.session.user.id}
		onclose={() => (showInvite = false)}
		oncreated={loadLitterTab}
	/>
{/if}

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0 1.25rem 1rem;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		background: var(--color-surface);
		padding: 0.3rem;
		border-radius: 999px;
		box-shadow: var(--shadow-card);
	}

	.tabs button {
		flex: 1;
		border: none;
		background: transparent;
		padding: 0.55rem 0.5rem;
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.tabs button:not(.active):hover {
		background: var(--color-bg);
	}

	.tabs button.active {
		background: var(--color-primary);
		color: var(--color-primary-text);
	}

	.card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card h2 {
		font-size: 0.95rem;
	}

	.card-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.add-btn {
		border: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.45rem 0.85rem;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	thead th {
		text-align: left;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0 0.5rem 0.5rem;
		white-space: nowrap;
	}

	tbody td {
		padding: 0.6rem 0.5rem;
		border-top: 1px solid var(--color-border);
		vertical-align: middle;
		white-space: nowrap;
	}

	.actions-cell {
		text-align: right;
	}

	.muted {
		color: var(--color-text-muted);
	}

	.remove {
		border: none;
		background: none;
		color: var(--color-danger);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.2rem 0.3rem;
	}

	.inline-form {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
	}

	input:disabled {
		color: var(--color-text-muted);
	}

	.inline-form button {
		border: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-weight: 600;
		border-radius: var(--radius-sm);
		padding: 0.6rem 1rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.error {
		color: var(--color-danger);
		font-size: 0.85rem;
		margin: 0;
	}

	.error.center {
		text-align: center;
	}

	.profile-card {
		align-items: center;
		text-align: center;
	}

	.profile-card form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: left;
	}

	.profile-card label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.profile-card button[type='submit'] {
		border: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-weight: 600;
		border-radius: var(--radius-sm);
		padding: 0.7rem;
		cursor: pointer;
	}

	.sign-out {
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-danger);
		font-weight: 600;
		border-radius: var(--radius-md);
		padding: 0.75rem;
		cursor: pointer;
	}
</style>
