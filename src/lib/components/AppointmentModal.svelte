<script>
	import Modal from '$lib/components/Modal.svelte';
	import { createAppointment, uploadAppointmentDocument, addAppointmentDocument } from '$lib/api/appointments.js';
	import { auth, litterState } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue, roundToQuarterHour } from '$lib/utils/datetimeLocal.js';
	import { APPOINTMENT_TYPES } from '$lib/appointmentOptions.js';

	const MAX_FILE_BYTES = 10 * 1024 * 1024;

	let { cats, prefillDate = null, onclose, oncreated } = $props();

	let title = $state('');
	let titleError = $state(false);
	let selectedType = $state('vet_visit');
	let selectedCatId = $state(cats[0]?.id ?? null);
	let scheduledAt = $state(toDatetimeLocalValue(roundToQuarterHour(prefillDate ?? new Date())));
	let address = $state('');
	let notes = $state('');
	let documentFiles = $state([]);
	let fileInputEl = $state();
	let locationExpanded = $state(false);
	let descriptionExpanded = $state(false);
	let documentsExpanded = $state(false);
	let saving = $state(false);
	let error = $state('');

	const selectedCat = $derived(cats.find((c) => c.id === selectedCatId));
	const minDateTime = $derived(selectedCat?.birthday ? `${selectedCat.birthday}T00:00` : undefined);

	const canSubmit = $derived(selectedCatId && scheduledAt);

	function triggerPicker() {
		fileInputEl?.click();
	}

	function openDocuments() {
		documentsExpanded = true;
		triggerPicker();
	}

	function onDocumentsChange(event) {
		const files = Array.from(event.target.files ?? []);
		const tooBig = files.find((f) => f.size > MAX_FILE_BYTES);
		if (tooBig) {
			error = `${tooBig.name} is over 10MB`;
		} else {
			error = '';
			documentFiles = [...documentFiles, ...files];
		}
		event.target.value = '';
	}

	function removeDocument(index) {
		documentFiles = documentFiles.filter((_, i) => i !== index);
	}

	async function submit(event) {
		event.preventDefault();
		if (!title.trim()) {
			titleError = true;
			return;
		}
		if (!canSubmit) return;
		saving = true;
		error = '';
		try {
			const catName = selectedCat?.name ?? 'Cat';
			const appointment = await createAppointment({
				catId: selectedCatId,
				title: title.trim(),
				type: selectedType,
				scheduledAt: new Date(scheduledAt).toISOString(),
				address,
				notes,
				userId: auth.session.user.id
			});
			for (const file of documentFiles) {
				const url = await uploadAppointmentDocument(litterState.litter.id, selectedCatId, file);
				await addAppointmentDocument(appointment.id, url, file.name);
			}
			oncreated?.();
			onclose();
			showToast(`Appointment added for ${catName}`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}
</script>

<Modal title="Add appointment" {onclose}>
	<form onsubmit={submit}>
		<label>
			Title
			<input
				type="text"
				bind:value={title}
				placeholder="e.g. Annual checkup"
				oninput={() => (titleError = false)}
				class:invalid={titleError}
			/>
			{#if titleError}
				<span class="field-error">Title is required</span>
			{/if}
		</label>

		<fieldset>
			<legend>Type</legend>
			<div class="pill-options">
				{#each APPOINTMENT_TYPES as t (t.key)}
					<label class="pill-option" class:selected={selectedType === t.key}>
						<input type="radio" name="apptype" value={t.key} bind:group={selectedType} />
						{t.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>Cat</legend>
			<div class="pill-options">
				{#each cats as cat (cat.id)}
					<label class="pill-option" class:selected={selectedCatId === cat.id}>
						<input type="radio" name="cat" value={cat.id} bind:group={selectedCatId} />
						<span class="dot" style:background={cat.color}></span>
						{cat.name}
					</label>
				{/each}
			</div>
		</fieldset>

		<label>
			Date &amp; time
			<input type="datetime-local" bind:value={scheduledAt} min={minDateTime} step="900" required />
		</label>

		<div class="detail-row">
			{#if locationExpanded}
				<span class="row-icon">📍</span>
				<input type="text" bind:value={address} placeholder="Add location" class="row-input" />
			{:else}
				<button type="button" class="row-placeholder" onclick={() => (locationExpanded = true)}>
					<span class="row-icon">📍</span> Add location
				</button>
			{/if}
		</div>

		<div class="detail-row">
			{#if descriptionExpanded}
				<span class="row-icon">📝</span>
				<textarea rows="3" bind:value={notes} placeholder="Add description" class="row-input"></textarea>
			{:else}
				<button type="button" class="row-placeholder" onclick={() => (descriptionExpanded = true)}>
					<span class="row-icon">📝</span> Add description
				</button>
			{/if}
		</div>

		<div class="detail-row">
			<input
				bind:this={fileInputEl}
				type="file"
				multiple
				class="hidden-input"
				onchange={onDocumentsChange}
			/>
			{#if documentsExpanded}
				<span class="row-icon">📎</span>
				<div class="documents-body">
					{#if documentFiles.length > 0}
						<ul class="document-list">
							{#each documentFiles as file, i (file.name + i)}
								<li>
									<span class="doc-icon">📄</span>
									<span class="doc-name">{file.name}</span>
									<button type="button" onclick={() => removeDocument(i)}>Remove</button>
								</li>
							{/each}
						</ul>
					{/if}
					<button type="button" class="add-doc-btn" onclick={triggerPicker}>+ Add document</button>
				</div>
			{:else}
				<button type="button" class="row-placeholder" onclick={openDocuments}>
					<span class="row-icon">📎</span> Add documents
				</button>
			{/if}
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!canSubmit || saving}>
			{saving ? 'Saving…' : 'Add appointment'}
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
	input[type='text'] {
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-weight: 400;
	}

	input.invalid {
		border-color: var(--color-danger);
	}

	.field-error {
		color: var(--color-danger);
		font-size: 0.78rem;
		font-weight: 400;
	}

	textarea {
		resize: vertical;
	}

	.detail-row {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
	}

	.row-icon {
		flex-shrink: 0;
		font-size: 1rem;
		line-height: 1.6;
	}

	.row-input {
		flex: 1;
		min-width: 0;
	}

	.row-placeholder {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		border: none;
		background: none;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 400;
		padding: 0.4rem 0;
		cursor: pointer;
		text-align: left;
	}

	.row-placeholder:hover {
		color: var(--color-text);
	}

	.documents-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.document-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.document-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
	}

	.doc-icon {
		flex-shrink: 0;
	}

	.doc-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.document-list button {
		border: none;
		background: none;
		color: var(--color-danger);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		flex-shrink: 0;
	}

	.add-doc-btn {
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
