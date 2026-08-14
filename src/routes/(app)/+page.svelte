<script>
	import { litterState } from '$lib/state/app.svelte.js';
	import { listWeighIns } from '$lib/api/weighIns.js';
	import { listIncidents } from '$lib/api/incidents.js';
	import { listEventCats } from '$lib/api/cats.js';
	import WeightGraph from '$lib/components/WeightGraph.svelte';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import WeighInModal from '$lib/components/WeighInModal.svelte';
	import IncidentModal from '$lib/components/IncidentModal.svelte';
	import EditIncidentModal from '$lib/components/EditIncidentModal.svelte';

	const PERIOD_OPTIONS = [
		{ days: 30, label: '30 days' },
		{ days: 90, label: '90 days' },
		{ days: 180, label: '6 months' }
	];

	let weighIns = $state([]);
	let incidents = $state([]);
	let eventCats = $state([]);
	let loaded = $state(false);
	let showWeighInModal = $state(false);
	let showIncidentModal = $state(false);
	let editingIncident = $state(null);

	let selectedCatId = $state('all');
	let periodDays = $state(30);

	async function loadData() {
		if (!litterState.litter) return;
		const [w, i, ec] = await Promise.all([
			listWeighIns(litterState.litter.id),
			listIncidents(litterState.litter.id),
			listEventCats(litterState.litter.id)
		]);
		weighIns = w;
		incidents = i;
		eventCats = ec;
		loaded = true;
	}

	$effect(() => {
		if (litterState.ready) loadData();
	});

	const filterCatOptions = $derived([
		{ id: 'all', name: 'All cats' },
		...litterState.cats,
		...eventCats.filter((c) => c.is_unknown)
	]);

	const filteredWeightCats = $derived(
		selectedCatId === 'all' ? litterState.cats : litterState.cats.filter((c) => c.id === selectedCatId)
	);

	const filteredWeighIns = $derived.by(() => {
		const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
		return weighIns.filter(
			(w) =>
				(selectedCatId === 'all' || w.cat_id === selectedCatId) &&
				new Date(w.created_at).getTime() >= cutoff
		);
	});

	// Cat-filtered only, no period cutoff — "vs last weigh-in" should reflect the two
	// most recent real readings regardless of the selected graph window.
	const catFilteredWeighIns = $derived(
		selectedCatId === 'all' ? weighIns : weighIns.filter((w) => w.cat_id === selectedCatId)
	);

	const calendarCats = $derived(
		selectedCatId === 'all' ? eventCats : eventCats.filter((c) => c.id === selectedCatId)
	);

	// Cat-filtered only — EventCalendar windows this itself by periodDays, and needs
	// history further back than the visible range to compute the previous-period trend.
	const filteredIncidents = $derived(
		selectedCatId === 'all' ? incidents : incidents.filter((v) => v.cat_id === selectedCatId)
	);

	function catNameFor(catId) {
		return eventCats.find((c) => c.id === catId)?.name ?? 'Cat';
	}

	function catBirthdayFor(catId) {
		return eventCats.find((c) => c.id === catId)?.birthday ?? null;
	}
</script>

<div class="dashboard">
	<header class="page-header">
		<div>
			<p class="eyebrow">{litterState.litter?.name}</p>
			<h1>Dashboard</h1>
		</div>

		{#if litterState.cats.length > 0}
			<div class="filters">
				<label class="filter">
					<span>Cat</span>
					<select bind:value={selectedCatId}>
						{#each filterCatOptions as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</label>
				<label class="filter">
					<span>Period</span>
					<select bind:value={periodDays}>
						{#each PERIOD_OPTIONS as opt (opt.days)}
							<option value={opt.days}>{opt.label}</option>
						{/each}
					</select>
				</label>
			</div>
		{/if}
	</header>

	{#if litterState.cats.length === 0}
		<div class="empty-state">
			<p>You don't have any cats yet.</p>
			<a href="/cats" class="cta">Add a cat →</a>
		</div>
	{:else if !loaded}
		<div class="card skeleton" aria-hidden="true">
			<div class="skeleton-line skeleton-title"></div>
			<div class="skeleton-line skeleton-graph"></div>
		</div>
		<div class="card skeleton" aria-hidden="true">
			<div class="skeleton-line skeleton-title"></div>
			<div class="skeleton-line skeleton-graph"></div>
		</div>
	{:else}
		<section class="card">
			<div class="card-header">
				<h2>Weight Loss</h2>
				<button class="action" onclick={() => (showWeighInModal = true)}>+ Log weight</button>
			</div>
			<WeightGraph cats={filteredWeightCats} weighIns={filteredWeighIns} allWeighIns={catFilteredWeighIns} />
		</section>

		<section class="card">
			<div class="card-header">
				<h2>Event Tracking</h2>
				<button class="action" onclick={() => (showIncidentModal = true)}>+ Log incident</button>
			</div>
			<EventCalendar
				cats={calendarCats}
				events={filteredIncidents}
				{periodDays}
				onSelectEvent={(ev) => (editingIncident = ev)}
			/>
		</section>
	{/if}
</div>

{#if showWeighInModal}
	<WeighInModal
		cats={litterState.cats}
		onclose={() => (showWeighInModal = false)}
		oncreated={loadData}
	/>
{/if}

{#if showIncidentModal}
	<IncidentModal cats={eventCats} onclose={() => (showIncidentModal = false)} oncreated={loadData} />
{/if}

{#if editingIncident}
	<EditIncidentModal
		incident={editingIncident}
		catName={catNameFor(editingIncident.cat_id)}
		catBirthday={catBirthdayFor(editingIncident.cat_id)}
		onclose={() => (editingIncident = null)}
		onsaved={loadData}
	/>
{/if}

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1rem;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.eyebrow {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	h1 {
		font-size: 1.4rem;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.filter select {
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.85rem;
		font-weight: 400;
	}

	@media (min-width: 860px) {
		.page-header {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1.1rem 1.1rem 1.25rem;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		gap: 0.5rem;
	}

	.card-header h2 {
		font-size: 1rem;
	}

	.action {
		border: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.5rem 0.85rem;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
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
		color: var(--color-primary);
		font-weight: 600;
		text-decoration: none;
	}

	.skeleton-line {
		border-radius: var(--radius-sm);
		background: linear-gradient(
			90deg,
			var(--color-border) 25%,
			color-mix(in srgb, var(--color-border) 50%, var(--color-surface)) 37%,
			var(--color-border) 63%
		);
		background-size: 400% 100%;
		animation: skeleton-shimmer 1.4s ease infinite;
	}

	.skeleton-title {
		width: 40%;
		height: 1rem;
		margin-bottom: 1rem;
	}

	.skeleton-graph {
		width: 100%;
		height: 180px;
	}

	@keyframes skeleton-shimmer {
		0% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0 50%;
		}
	}
</style>
