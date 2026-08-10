<script>
	import Modal from '$lib/components/Modal.svelte';
	import { addVomitEvent } from '$lib/api/vomitEvents.js';
	import { auth } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue } from '$lib/utils/datetimeLocal.js';
	import { CONTENT_OPTIONS, AMOUNT_OPTIONS, TIMING_OPTIONS, APPETITE_OPTIONS, ENERGY_OPTIONS } from '$lib/vomitOptions.js';

	let { cats, onclose, oncreated } = $props();

	const maxDateTime = toDatetimeLocalValue(new Date());

	let selectedCatId = $state(cats[0]?.id ?? null);
	let occurredAt = $state(maxDateTime);
	let content = $state('');
	let amount = $state('');
	let timing = $state('unknown');
	let appetite = $state('normal');
	let energyLevel = $state('normal');
	let diarrhea = $state(false);
	let blood = $state(false);
	let urineChanges = $state(false);
	let notes = $state('');
	let saving = $state(false);
	let error = $state('');

	const selectedCat = $derived(cats.find((c) => c.id === selectedCatId));
	const minDateTime = $derived(
		selectedCat?.birthday ? `${selectedCat.birthday}T00:00` : undefined
	);

	const canSubmit = $derived(selectedCatId && occurredAt && content && amount);

	async function submit(event) {
		event.preventDefault();
		if (!canSubmit) return;
		saving = true;
		error = '';
		try {
			const catName = selectedCat?.name ?? 'Cat';
			await addVomitEvent({
				catId: selectedCatId,
				notes,
				userId: auth.session.user.id,
				occurredAt: new Date(occurredAt).toISOString(),
				content,
				amount,
				timing,
				appetite,
				energyLevel,
				diarrhea,
				blood,
				urineChanges
			});
			oncreated?.();
			onclose();
			showToast(`Logged puke for ${catName}`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}
</script>

<Modal title="Log puke" {onclose}>
	<form onsubmit={submit}>
		<fieldset>
			<legend>Cat</legend>
			<div class="pill-options">
				{#each cats as cat (cat.id)}
					<label class="pill-option" class:selected={selectedCatId === cat.id}>
						<input type="radio" name="cat" value={cat.id} bind:group={selectedCatId} />
						{#if !cat.is_unknown}
							<span class="dot" style:background={cat.color}></span>
						{/if}
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

		<label>
			Content
			<select bind:value={content} required>
				<option value="" disabled>Select…</option>
				{#each CONTENT_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>

		<fieldset>
			<legend>Amount</legend>
			<div class="pill-options">
				{#each AMOUNT_OPTIONS as opt (opt.value)}
					<label class="pill-option" class:selected={amount === opt.value}>
						<input type="radio" name="amount" value={opt.value} bind:group={amount} required />
						{opt.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<label>
			Timing
			<select bind:value={timing}>
				{#each TIMING_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>

		<fieldset class="signs">
			<legend>Associated signs</legend>

			<div class="sign-group">
				<span class="sign-label">Appetite</span>
				<div class="pill-options">
					{#each APPETITE_OPTIONS as opt (opt.value)}
						<label class="pill-option" class:selected={appetite === opt.value}>
							<input type="radio" name="appetite" value={opt.value} bind:group={appetite} />
							{opt.label}
						</label>
					{/each}
				</div>
			</div>

			<div class="sign-group">
				<span class="sign-label">Energy level</span>
				<div class="pill-options">
					{#each ENERGY_OPTIONS as opt (opt.value)}
						<label class="pill-option" class:selected={energyLevel === opt.value}>
							<input type="radio" name="energy" value={opt.value} bind:group={energyLevel} />
							{opt.label}
						</label>
					{/each}
				</div>
			</div>

			<label class="checkbox-row">
				<input type="checkbox" bind:checked={diarrhea} />
				Diarrhea
			</label>
			<label class="checkbox-row">
				<input type="checkbox" bind:checked={blood} />
				Blood
			</label>
			<label class="checkbox-row">
				<input type="checkbox" bind:checked={urineChanges} />
				Urine changes
			</label>
		</fieldset>

		<label>
			Notes (optional)
			<textarea rows="3" bind:value={notes} placeholder="Anything else worth noting…"></textarea>
		</label>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!canSubmit || saving}>
			{saving ? 'Saving…' : 'Log it'}
		</button>
	</form>
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
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

	.pill-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pill-option {
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

	.pill-option:hover {
		border-color: var(--color-primary);
	}

	.pill-option.selected {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.pill-option input {
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

	textarea,
	input[type='datetime-local'],
	select {
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-weight: 400;
	}

	textarea {
		resize: vertical;
	}

	.signs {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.signs legend {
		margin-bottom: 0.25rem;
	}

	.sign-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.sign-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.checkbox-row {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-text);
		font-weight: 400;
		cursor: pointer;
	}

	.checkbox-row input {
		width: 16px;
		height: 16px;
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
