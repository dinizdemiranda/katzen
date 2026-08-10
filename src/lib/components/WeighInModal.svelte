<script>
	import Modal from '$lib/components/Modal.svelte';
	import { addWeighIn } from '$lib/api/weighIns.js';
	import { auth, refreshCats } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue } from '$lib/utils/datetimeLocal.js';

	let { cats, onclose, oncreated } = $props();

	const maxDateTime = toDatetimeLocalValue(new Date());

	let selectedCatId = $state(cats[0]?.id ?? null);
	let occurredAt = $state(maxDateTime);
	let useDelta = $state(true);
	let personWeight = $state('');
	let personCatWeight = $state('');
	let directWeight = $state('');
	let saving = $state(false);
	let error = $state('');

	const selectedCat = $derived(cats.find((c) => c.id === selectedCatId));
	const minDateTime = $derived(selectedCat?.birthday ? `${selectedCat.birthday}T00:00` : undefined);

	const computedWeight = $derived(
		useDelta
			? Number(personCatWeight) - Number(personWeight)
			: Number(directWeight)
	);

	const canSubmit = $derived(
		selectedCatId &&
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
			const catName = selectedCat?.name ?? 'Cat';
			await addWeighIn({
				catId: selectedCatId,
				method: useDelta ? 'delta' : 'direct',
				weight: useDelta ? null : Number(directWeight),
				personWeight: useDelta ? Number(personWeight) : null,
				personCatWeight: useDelta ? Number(personCatWeight) : null,
				userId: auth.session.user.id,
				occurredAt: new Date(occurredAt).toISOString()
			});
			await refreshCats();
			oncreated?.();
			onclose();
			showToast(`${catName}'s weigh-in saved: ${computedWeight.toFixed(2)} kg`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}
</script>

<Modal title="Log a weigh-in" {onclose}>
	<form onsubmit={submit}>
		<fieldset>
			<legend>Cat</legend>
			<div class="cat-options">
				{#each cats as cat (cat.id)}
					<label class="cat-option" class:selected={selectedCatId === cat.id}>
						<input type="radio" name="cat" value={cat.id} bind:group={selectedCatId} />
						<span class="dot" style:background={cat.color}></span>
						{cat.name}
					</label>
				{/each}
			</div>
		</fieldset>

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

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!canSubmit || saving}>
			{saving ? 'Saving…' : 'Save weigh-in'}
		</button>
	</form>
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}

	legend {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
		padding: 0;
	}

	.cat-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.cat-option {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		padding: 0.45rem 0.85rem;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.cat-option:hover {
		border-color: var(--color-primary);
	}

	.cat-option.selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.cat-option input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
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
	label input[type='datetime-local'] {
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-weight: 400;
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
</style>
