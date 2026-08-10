<script>
	import Modal from '$lib/components/Modal.svelte';
	import InitialsAvatar from '$lib/components/InitialsAvatar.svelte';
	import { createCat, uploadCatPhoto, updateCat } from '$lib/api/cats.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { getInitials } from '$lib/utils/initials.js';

	const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

	let { litterId, onclose, oncreated } = $props();

	let name = $state('');
	let birthday = $state('');
	let gender = $state('');
	let microchipNumber = $state('');
	let photoFile = $state(null);
	let photoPreview = $state(null);
	let saving = $state(false);
	let error = $state('');

	const canSubmit = $derived(name.trim() && gender);

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

	async function submit(event) {
		event.preventDefault();
		if (!canSubmit) return;
		saving = true;
		error = '';
		try {
			const catName = name.trim();
			const newCat = await createCat(litterId, {
				name: catName,
				birthday: birthday || null,
				gender,
				microchipNumber: microchipNumber.trim() || null
			});
			if (photoFile) {
				const photoUrl = await uploadCatPhoto(litterId, newCat.id, photoFile);
				await updateCat(newCat.id, { photo_url: photoUrl });
			}
			oncreated?.();
			onclose();
			showToast(`${catName} added`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}
</script>

<Modal title="Add a cat" {onclose}>
	<form onsubmit={submit}>
		<label class="photo-field">
			Photo
			<span class="photo-picker">
				{#if photoPreview}
					<img class="photo-preview" src={photoPreview} alt="" />
				{:else}
					<InitialsAvatar text={getInitials(name)} size={72} />
				{/if}
				<span class="photo-change">Add photo</span>
				<input type="file" accept="image/*" onchange={onPhotoChange} />
			</span>
		</label>

		<label>
			Name
			<input type="text" bind:value={name} placeholder="Cat name" required />
		</label>

		<fieldset>
			<legend>Gender</legend>
			<div class="pill-options">
				<label class="pill-option" class:selected={gender === 'male'}>
					<input type="radio" name="gender" value="male" bind:group={gender} required />
					Male
				</label>
				<label class="pill-option" class:selected={gender === 'female'}>
					<input type="radio" name="gender" value="female" bind:group={gender} required />
					Female
				</label>
			</div>
		</fieldset>

		<label>
			Birthday (optional)
			<input type="date" bind:value={birthday} max={new Date().toISOString().slice(0, 10)} />
		</label>

		<label>
			Microchip number (optional)
			<input type="text" bind:value={microchipNumber} placeholder="e.g. 985121000000000" />
		</label>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={!canSubmit || saving}>
			{saving ? 'Adding…' : 'Add cat'}
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
		font-weight: 400;
		color: var(--color-text);
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

	.photo-picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		width: fit-content;
		cursor: pointer;
	}

	.photo-preview {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		object-fit: cover;
	}

	.photo-change {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.photo-picker input[type='file'] {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
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
