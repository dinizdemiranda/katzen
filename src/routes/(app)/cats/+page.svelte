<script>
	import { litterState, refreshCats } from '$lib/state/app.svelte.js';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CatAvatar from '$lib/components/CatAvatar.svelte';
	import AddCatModal from '$lib/components/AddCatModal.svelte';
	import { formatBirthday, formatAge } from '$lib/utils/catDates.js';

	let showAddCat = $state(false);
</script>

<AppHeader title="Cats">
	<button class="add-btn" onclick={() => (showAddCat = true)}>+ Add cat</button>
</AppHeader>

<div class="cats-page">
	{#if litterState.cats.length === 0}
		<div class="empty-state">
			<p>No cats yet.</p>
			<button class="cta" onclick={() => (showAddCat = true)}>+ Add a cat</button>
		</div>
	{:else}
		{#each litterState.cats as cat (cat.id)}
			<a href="/cats/{cat.id}" class="cat-card">
				<CatAvatar {cat} size={56} />
				<div class="cat-info">
					<h2>{cat.name}</h2>
					<p class="weight">{cat.weight ? `${Number(cat.weight).toFixed(2)} kg` : 'No weigh-ins yet'}</p>
					<p class="birthday">
						{formatBirthday(cat.birthday)}
						{#if cat.birthday}
							<span class="age">· {formatAge(cat.birthday)}</span>
						{/if}
					</p>
				</div>
				<span class="chevron" aria-hidden="true">›</span>
			</a>
		{/each}
	{/if}
</div>

{#if showAddCat}
	<AddCatModal
		litterId={litterState.litter.id}
		onclose={() => (showAddCat = false)}
		oncreated={refreshCats}
	/>
{/if}

<style>
	.cats-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0 1.25rem 1rem;
	}

	.cat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1rem 1.1rem;
		text-decoration: none;
		color: inherit;
	}

	.cat-card:hover {
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.35),
			0 6px 20px rgba(0, 0, 0, 0.4);
	}

	.cat-info {
		flex: 1;
		min-width: 0;
	}

	.cat-info h2 {
		font-size: 1.05rem;
	}

	.weight {
		color: var(--color-text);
		font-weight: 600;
		font-size: 0.9rem;
		margin-top: 0.2rem;
	}

	.birthday {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin-top: 0.15rem;
	}

	.age {
		color: var(--color-text-muted);
	}

	.chevron {
		color: var(--color-text-muted);
		font-size: 1.4rem;
	}

	.empty-state {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 2rem 1.25rem;
		text-align: center;
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.cta {
		border: none;
		background: none;
		color: var(--color-primary);
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
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
</style>
