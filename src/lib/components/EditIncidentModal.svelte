<script>
	import Modal from '$lib/components/Modal.svelte';
	import { updateIncident, deleteIncident, uploadIncidentPhoto, createIncidentType } from '$lib/api/incidents.js';
	import { litterState } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue, roundToQuarterHour, ceilToQuarterHour } from '$lib/utils/datetimeLocal.js';
	import {
		BUILTIN_INCIDENT_TYPES,
		BUILTIN_INCIDENT_KEYS,
		CONTENT_OPTIONS,
		AMOUNT_OPTIONS,
		TIMING_OPTIONS,
		APPETITE_OPTIONS,
		ENERGY_OPTIONS
	} from '$lib/incidentOptions.js';

	const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

	let { incident, catName, catBirthday, onclose, onsaved } = $props();

	const nowCeil = ceilToQuarterHour(new Date());
	const maxDateTime = toDatetimeLocalValue(nowCeil);
	const minDateTime = catBirthday ? `${catBirthday}T00:00` : undefined;

	let selectedTypeKey = $state(incident.type === 'custom' ? incident.custom_type_id : incident.type);
	let addingType = $state(false);
	let newTypeLabel = $state('');
	let savingNewType = $state(false);

	const initialOccurred = roundToQuarterHour(new Date(incident.created_at));
	let occurredAt = $state(toDatetimeLocalValue(initialOccurred > nowCeil ? nowCeil : initialOccurred));
	let content = $state(incident.content ?? '');
	let amount = $state(incident.amount ?? '');
	let timing = $state(incident.timing ?? 'unknown');
	let appetite = $state(incident.appetite);
	let energyLevel = $state(incident.energy_level);
	let diarrhea = $state(incident.diarrhea);
	let blood = $state(incident.blood);
	let urineChanges = $state(incident.urine_changes);
	let notes = $state(incident.notes ?? '');
	let photoFile = $state(null);
	let photoPreview = $state(incident.photo_url ?? null);
	let fileInputEl = $state();
	let showLightbox = $state(false);
	let saving = $state(false);
	let removing = $state(false);
	let error = $state('');

	const isCustomSelected = $derived(!BUILTIN_INCIDENT_KEYS.includes(selectedTypeKey));
	const isPuke = $derived(selectedTypeKey === 'puke');

	const canSubmit = $derived(occurredAt && (!isPuke || (content && amount)));

	async function saveNewType() {
		const label = newTypeLabel.trim();
		if (!label) return;
		savingNewType = true;
		error = '';
		try {
			const newType = await createIncidentType(litterState.litter.id, label);
			litterState.incidentTypes.push(newType);
			selectedTypeKey = newType.id;
			newTypeLabel = '';
			addingType = false;
		} catch (e) {
			error = e.message;
		} finally {
			savingNewType = false;
		}
	}

	function triggerPicker() {
		fileInputEl?.click();
	}

	function onPhotoChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (file.size > MAX_PHOTO_BYTES) {
			error = 'Photo must be under 5MB';
			event.target.value = '';
			return;
		}
		error = '';
		photoFile = file;
		photoPreview = URL.createObjectURL(file);
	}

	function removePhoto() {
		photoFile = null;
		photoPreview = null;
		if (fileInputEl) fileInputEl.value = '';
	}

	async function submit(event) {
		event.preventDefault();
		if (!canSubmit) return;
		saving = true;
		error = '';
		try {
			let photoUrl = photoPreview === null ? null : incident.photo_url;
			if (photoFile) {
				photoUrl = await uploadIncidentPhoto(litterState.litter.id, incident.cat_id, photoFile);
			}
			await updateIncident(incident.id, {
				type: isCustomSelected ? 'custom' : selectedTypeKey,
				customTypeId: isCustomSelected ? selectedTypeKey : null,
				occurredAt: new Date(occurredAt).toISOString(),
				content: isPuke ? content : null,
				amount: isPuke ? amount : null,
				timing: isPuke ? timing : null,
				appetite,
				energyLevel,
				diarrhea,
				blood,
				urineChanges,
				notes,
				photoUrl
			});
			onsaved?.();
			onclose();
			showToast(`${catName}'s incident updated`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!confirm('Remove this incident?')) return;
		removing = true;
		error = '';
		try {
			await deleteIncident(incident.id);
			onsaved?.();
			onclose();
			showToast('Incident removed');
		} catch (e) {
			error = e.message;
			removing = false;
		}
	}
</script>

<Modal title="Edit incident" {onclose}>
	<form onsubmit={submit}>
		<fieldset>
			<legend>Type</legend>
			<div class="pill-options">
				{#each BUILTIN_INCIDENT_TYPES as t (t.key)}
					<label class="pill-option" class:selected={selectedTypeKey === t.key}>
						<input type="radio" name="type" value={t.key} bind:group={selectedTypeKey} />
						{t.emoji}
						{t.label}
					</label>
				{/each}
				{#each litterState.incidentTypes as t (t.id)}
					<label class="pill-option" class:selected={selectedTypeKey === t.id}>
						<input type="radio" name="type" value={t.id} bind:group={selectedTypeKey} />
						{t.label}
					</label>
				{/each}
				{#if !addingType}
					<button type="button" class="pill-option add-type-btn" onclick={() => (addingType = true)}>
						+ Add new
					</button>
				{/if}
			</div>
			{#if addingType}
				<div class="add-type-row">
					<input type="text" bind:value={newTypeLabel} placeholder="New type name" maxlength="40" />
					<button type="button" onclick={saveNewType} disabled={!newTypeLabel.trim() || savingNewType}>
						{savingNewType ? 'Adding…' : 'Add'}
					</button>
					<button
						type="button"
						class="cancel-type-btn"
						onclick={() => {
							addingType = false;
							newTypeLabel = '';
						}}
					>
						Cancel
					</button>
				</div>
			{/if}
		</fieldset>

		<div class="photo-field">
			<span class="field-label">Photo (optional)</span>
			<input
				bind:this={fileInputEl}
				type="file"
				accept="image/*"
				class="hidden-input"
				onchange={onPhotoChange}
			/>
			{#if photoPreview}
				<div class="photo-preview-row">
					<button
						type="button"
						class="photo-thumb-btn"
						onclick={() => (showLightbox = true)}
						aria-label="View photo full size"
					>
						<img class="photo-thumb" src={photoPreview} alt="Incident" />
					</button>
					<div class="photo-actions">
						<button type="button" onclick={triggerPicker}>Change</button>
						<button type="button" class="remove" onclick={removePhoto}>Remove</button>
					</div>
				</div>
			{:else}
				<button type="button" class="add-photo-btn" onclick={triggerPicker}>+ Add photo</button>
			{/if}
		</div>

		<label>
			Date &amp; time
			<input
				type="datetime-local"
				bind:value={occurredAt}
				min={minDateTime}
				max={maxDateTime}
				step="900"
				required
			/>
		</label>

		{#if isPuke}
			<label>
				Content
				<select bind:value={content} required>
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
		{/if}

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
			{saving ? 'Saving…' : 'Save changes'}
		</button>

		<button type="button" class="remove-btn" onclick={remove} disabled={removing || saving}>
			{removing ? 'Removing…' : 'Remove incident'}
		</button>
	</form>
</Modal>

{#if showLightbox}
	<Modal title="Photo" onclose={() => (showLightbox = false)}>
		<img class="lightbox-image" src={photoPreview} alt="Incident" />
	</Modal>
{/if}

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

	.add-type-btn {
		background: none;
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.add-type-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.add-type-row input {
		flex: 1;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.85rem;
	}

	.add-type-row button {
		border: 1px solid var(--color-border);
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		white-space: nowrap;
	}

	.add-type-row .cancel-type-btn {
		background: none;
		color: var(--color-text-muted);
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

	.photo-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.add-photo-btn {
		align-self: flex-start;
		border: 1px dashed var(--color-border);
		background: none;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.photo-preview-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.photo-thumb-btn {
		border: none;
		background: none;
		padding: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		flex-shrink: 0;
	}

	.photo-thumb {
		display: block;
		width: 64px;
		height: 64px;
		border-radius: var(--radius-sm);
		object-fit: cover;
	}

	.photo-actions {
		display: flex;
		gap: 0.5rem;
	}

	.photo-actions button {
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.photo-actions button.remove {
		color: var(--color-danger);
	}

	.lightbox-image {
		display: block;
		width: 100%;
		border-radius: var(--radius-sm);
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
