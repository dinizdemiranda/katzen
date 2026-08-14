<script>
	import Modal from '$lib/components/Modal.svelte';
	import {
		updateAppointment,
		deleteAppointment,
		uploadAppointmentDocument,
		addAppointmentDocument,
		deleteAppointmentDocument
	} from '$lib/api/appointments.js';
	import { litterState } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { toDatetimeLocalValue, roundToQuarterHour } from '$lib/utils/datetimeLocal.js';
	import { APPOINTMENT_TYPES } from '$lib/appointmentOptions.js';

	const MAX_FILE_BYTES = 10 * 1024 * 1024;

	let { appointment, catName, catBirthday, onclose, onsaved } = $props();

	const minDateTime = catBirthday ? `${catBirthday}T00:00` : undefined;

	let title = $state(appointment.title ?? '');
	let titleError = $state(false);
	let selectedType = $state(appointment.type);
	let scheduledAt = $state(toDatetimeLocalValue(roundToQuarterHour(new Date(appointment.scheduled_at))));
	let address = $state(appointment.address ?? '');
	let notes = $state(appointment.notes ?? '');
	let existingDocuments = $state(appointment.appointment_documents ?? []);
	let newDocumentFiles = $state([]);
	let fileInputEl = $state();
	let locationExpanded = $state(!!appointment.address);
	let descriptionExpanded = $state(!!appointment.notes);
	let documentsExpanded = $state((appointment.appointment_documents ?? []).length > 0);
	let saving = $state(false);
	let removing = $state(false);
	let error = $state('');

	const canSubmit = $derived(!!scheduledAt);

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
			newDocumentFiles = [...newDocumentFiles, ...files];
		}
		event.target.value = '';
	}

	function removeExistingDocument(docId) {
		existingDocuments = existingDocuments.filter((d) => d.id !== docId);
	}

	function removeNewDocument(index) {
		newDocumentFiles = newDocumentFiles.filter((_, i) => i !== index);
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
			await updateAppointment(appointment.id, {
				title: title.trim(),
				type: selectedType,
				scheduledAt: new Date(scheduledAt).toISOString(),
				address,
				notes
			});

			const removedIds = (appointment.appointment_documents ?? [])
				.filter((d) => !existingDocuments.some((kept) => kept.id === d.id))
				.map((d) => d.id);
			for (const id of removedIds) {
				await deleteAppointmentDocument(id);
			}

			for (const file of newDocumentFiles) {
				const url = await uploadAppointmentDocument(litterState.litter.id, appointment.cat_id, file);
				await addAppointmentDocument(appointment.id, url, file.name);
			}

			onsaved?.();
			onclose();
			showToast(`${catName}'s appointment updated`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!confirm('Remove this appointment?')) return;
		removing = true;
		error = '';
		try {
			await deleteAppointment(appointment.id);
			onsaved?.();
			onclose();
			showToast('Appointment removed');
		} catch (e) {
			error = e.message;
			removing = false;
		}
	}
</script>

<Modal title="Edit appointment" {onclose}>
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
					{#if existingDocuments.length > 0 || newDocumentFiles.length > 0}
						<ul class="document-list">
							{#each existingDocuments as doc (doc.id)}
								<li>
									<span class="doc-icon">📄</span>
									<a class="doc-name" href={doc.file_url} target="_blank" rel="noopener">{doc.file_name}</a>
									<button type="button" onclick={() => removeExistingDocument(doc.id)}>Remove</button>
								</li>
							{/each}
							{#each newDocumentFiles as file, i (file.name + i)}
								<li>
									<span class="doc-icon">📄</span>
									<span class="doc-name">{file.name}</span>
									<button type="button" onclick={() => removeNewDocument(i)}>Remove</button>
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
			{saving ? 'Saving…' : 'Save changes'}
		</button>

		<button type="button" class="remove-btn" onclick={remove} disabled={removing || saving}>
			{removing ? 'Removing…' : 'Remove appointment'}
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
		color: var(--color-text);
		text-decoration: none;
	}

	a.doc-name:hover {
		text-decoration: underline;
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
