<script>
	import Modal from '$lib/components/Modal.svelte';
	import { updateWeighIn, deleteWeighIn } from '$lib/api/weighIns.js';
	import { refreshCats } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue } from '$lib/utils/datetimeLocal.js';

	let { weighIn, catName, catBirthday, onclose, onsaved } = $props();

	const maxDateTime = toDatetimeLocalValue(new Date());
	const minDateTime = catBirthday ? `${catBirthday}T00:00` : undefined;

	let occurredAt = $state(toDatetimeLocalValue(new Date(weighIn.created_at)));
	let useDelta = $state(weighIn.method === 'delta');
	let personWeight = $state(weighIn.person_weight ?? '');
	let personCatWeight = $state(weighIn.person_cat_weight ?? '');
	let directWeight = $state(weighIn.method === 'direct' ? weighIn.weight : '');
	let notes = $state(weighIn.notes ?? '');
	let saving = $state(false);
	let removing = $state(false);
	let error = $state('');

	const computedWeight = $derived(
		useDelta ? Number(personCatWeight) - Number(personWeight) : Number(directWeight)
	);

	const canSubmit = $derived(
		occurredAt &&
			(useDelta
				? personWeight !== '' && personCatWeight !== '' && computedWeight > 0
				: directWeight !== '' && computedWeight > 0)
	);

	async function submit(event) {
		event.preventDefault();
		if (!canSubmit) return;
		saving = true;
		error = '';
		try {
			await updateWeighIn(weighIn.id, {
				method: useDelta ? 'delta' : 'direct',
				weight: useDelta ? null : Number(directWeight),
				personWeight: useDelta ? Number(personWeight) : null,
				personCatWeight: useDelta ? Number(personCatWeight) : null,
				occurredAt: new Date(occurredAt).toISOString(),
				notes
			});
			await refreshCats();
			onsaved?.();
			onclose();
			showToast(`${catName}'s weigh-in updated`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!confirm('Remove this weigh-in?')) return;
		removing = true;
		error = '';
		try {
			await deleteWeighIn(weighIn.id);
			await refreshCats();
			onsaved?.();
			onclose();
			showToast('Weigh-in removed');
		} catch (e) {
			error = e.message;
			removing = false;
		}
	}
</script>

<Modal title="Edit weigh-in" {onclose}>
	<form onsubmit={submit}>
		<label>
			Date &amp; time
			<input
				type="datetime-local"
				bind:value={occurredAt}
				min={minDateTime}
				max={maxDateTime}
				required
			/>
		</label>

		<label class="toggle-row">
			<span>
				<strong>Subtract from weight</strong>
				<small>Weigh yourself holding the cat, then alone.</small>
			</span>
			<span class="switch">
				<input type="checkbox" bind:checked={useDelta} />
				<span class="track"><span class="thumb"></span></span>
			</span>
		</label>

		{#if useDelta}
			<label>
				Your weight holding the cat (kg)
				<input type="number" step="0.01" min="0" bind:value={personCatWeight} required />
			</label>
			<label>
				Your weight alone (kg)
				<input type="number" step="0.01" min="0" bind:value={personWeight} required />
			</label>
			{#if personWeight !== '' && personCatWeight !== ''}
				<p class="preview">Cat weight: <strong>{computedWeight.toFixed(2)} kg</strong></p>
			{/if}
		{:else}
			<label>
				Cat weight (kg)
				<input type="number" step="0.01" min="0" bind:value={directWeight} required />
			</label>
		{/if}

		<label>
			Notes (optional)
			<textarea rows="2" bind:value={notes} placeholder="Anything worth noting…"></textarea>
		</label>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!canSubmit || saving}>
			{saving ? 'Saving…' : 'Save changes'}
		</button>

		<button type="button" class="remove-btn" onclick={remove} disabled={removing || saving}>
			{removing ? 'Removing…' : 'Remove weigh-in'}
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

	label input[type='number'],
	label input[type='datetime-local'],
	label textarea {
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-weight: 400;
	}

	label textarea {
		resize: vertical;
		font-family: inherit;
	}

	.toggle-row {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.toggle-row span {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.toggle-row strong {
		color: var(--color-text);
		font-weight: 600;
	}

	.toggle-row small {
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.switch {
		position: relative;
		width: 42px;
		height: 24px;
		flex-shrink: 0;
	}

	.switch input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.track {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 999px;
		background: var(--color-border);
		transition: background 0.15s ease;
		pointer-events: none;
	}

	.thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.15s ease;
	}

	.switch input:checked ~ .track {
		background: var(--color-primary);
	}

	.switch input:checked ~ .track .thumb {
		transform: translateX(18px);
	}

	.preview {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--color-text);
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

	.remove-btn {
		padding: 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-danger);
		font-weight: 600;
		cursor: pointer;
	}

	.remove-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
