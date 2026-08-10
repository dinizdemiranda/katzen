<script>
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import InitialsAvatar from '$lib/components/InitialsAvatar.svelte';
	import { updateCat, deleteCat, uploadCatPhoto } from '$lib/api/cats.js';
	import { refreshCats } from '$lib/state/app.svelte.js';
	import { showToast } from '$lib/state/toast.svelte.js';
	import { getInitials } from '$lib/utils/initials.js';

	const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

	let { cat, onclose, onsaved } = $props();

	let name = $state(cat.name);
	let birthday = $state(cat.birthday ?? '');
	let gender = $state(cat.gender ?? '');
	let microchipNumber = $state(cat.microchip_number ?? '');
	let photoFile = $state(null);
	let photoPreview = $state(cat.photo_url);
	let saving = $state(false);
	let removing = $state(false);
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
			let photoUrl = cat.photo_url;
			if (photoFile) {
				photoUrl = await uploadCatPhoto(cat.litter_id, cat.id, photoFile);
			}
			await updateCat(cat.id, {
				name: name.trim(),
				birthday: birthday || null,
				gender,
				microchip_number: microchipNumber.trim() || null,
				photo_url: photoUrl
			});
			await refreshCats();
			onsaved?.();
			onclose();
			showToast(`${name.trim()} updated`);
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function removeCat() {
		if (!confirm(`Remove ${cat.name}? This deletes all their weigh-ins and puke logs too.`)) return;
		removing = true;
		error = '';
		try {
			await deleteCat(cat.id);
			await refreshCats();
			onclose();
			showToast(`${cat.name} removed`);
			goto('/cats');
		} catch (e) {
			error = e.message;
			removing = false;
		}
	}
</script>

<Modal title="Edit {cat.name}" {onclose}>
	<form onsubmit={submit}>
		<label class="photo-field">
			Photo
			<span class="photo-picker">
				{#if photoPreview}
					<img class="photo-preview" src={photoPreview} alt={cat.name} />
				{:else}
					<InitialsAvatar text={getInitials(cat.name)} color={cat.color} size={72} />
				{/if}
				<span class="photo-change">Change photo</span>
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
			{saving ? 'Saving…' : 'Save changes'}
		</button>

		<button type="button" class="remove-btn" onclick={removeCat} disabled={removing || saving}>
			{removing ? 'Removing…' : 'Remove cat'}
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
