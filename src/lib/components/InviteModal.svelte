<script>
	import Modal from '$lib/components/Modal.svelte';
	import { inviteMember } from '$lib/api/litters.js';
	import { showToast } from '$lib/state/toast.svelte.js';

	let { litterId, invitedBy, onclose, oncreated } = $props();

	let email = $state('');
	let saving = $state(false);
	let error = $state('');

	async function submit(event) {
		event.preventDefault();
		if (!email.trim()) return;
		saving = true;
		error = '';
		try {
			const value = email.trim();
			await inviteMember(litterId, value, invitedBy);
			oncreated?.();
			onclose();
			showToast(`Invite sent to ${value}`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}
</script>

<Modal title="Invite someone" {onclose}>
	<form onsubmit={submit}>
		<label>
			Email
			<input type="email" bind:value={email} placeholder="partner@example.com" required />
		</label>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!email.trim() || saving}>
			{saving ? 'Sending…' : 'Send invite'}
		</button>
	</form>
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	input {
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-weight: 400;
	}

	.error {
		color: var(--color-danger);
		font-size: 0.85rem;
		margin: 0;
	}

	button[type='submit'] {
		padding: 0.8rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-weight: 600;
		cursor: pointer;
	}

	button[type='submit']:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
