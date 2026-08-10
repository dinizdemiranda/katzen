<script>
	import { litterState } from '$lib/state/app.svelte.js';
	import { listWeighIns } from '$lib/api/weighIns.js';
	import { listVomitEvents } from '$lib/api/vomitEvents.js';
	import { listVomitCats } from '$lib/api/cats.js';
	import WeightGraph from '$lib/components/WeightGraph.svelte';
	import VomitGraph from '$lib/components/VomitGraph.svelte';
	import WeighInModal from '$lib/components/WeighInModal.svelte';
	import VomitModal from '$lib/components/VomitModal.svelte';

	let weighIns = $state([]);
	let vomitEvents = $state([]);
	let vomitCats = $state([]);
	let loaded = $state(false);
	let showWeighInModal = $state(false);
	let showVomitModal = $state(false);

	async function loadData() {
		if (!litterState.litter) return;
		const [w, v, vc] = await Promise.all([
			listWeighIns(litterState.litter.id),
			listVomitEvents(litterState.litter.id),
			listVomitCats(litterState.litter.id)
		]);
		weighIns = w;
		vomitEvents = v;
		vomitCats = vc;
		loaded = true;
	}

	$effect(() => {
		if (litterState.ready) loadData();
	});
</script>

<div class="dashboard">
	<header class="page-header">
		<div>
			<p class="eyebrow">{litterState.litter?.name}</p>
			<h1>Dashboard</h1>
		</div>
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
			<WeightGraph cats={litterState.cats} {weighIns} />
		</section>

		<section class="card">
			<div class="card-header">
				<h2>Puke Tracking</h2>
				<button class="action" onclick={() => (showVomitModal = true)}>+ Log puke</button>
			</div>
			<VomitGraph cats={vomitCats} events={vomitEvents} />
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

{#if showVomitModal}
	<VomitModal cats={vomitCats} onclose={() => (showVomitModal = false)} oncreated={loadData} />
{/if}

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding:  1.25rem 1rem;
	}

	.page-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
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
