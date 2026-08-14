<script>
	import { onDestroy } from 'svelte';
	import { Chart } from '$lib/chartSetup.js';
	import { sevenDayAverageSeries, seriesDelta } from '$lib/utils/rollingAverage.js';
	import CatAvatar from '$lib/components/CatAvatar.svelte';

	let { cats, weighIns, allWeighIns = weighIns } = $props();

	let canvasEl = $state();
	let chart;

	function dayKey(iso) {
		return new Date(iso).toISOString().slice(0, 10);
	}

	function formatLabel(key) {
		return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	/** Change between the two most recent raw readings for a cat, independent of
	 *  whatever period window the graph itself is showing. */
	function lastVsPreviousFor(catId) {
		const rows = allWeighIns
			.filter((w) => w.cat_id === catId)
			.slice()
			.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		if (rows.length < 2) return null;
		const diff = Number(rows[0].weight) - Number(rows[1].weight);
		const cls = diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down';
		const arrow = diff === 0 ? '→' : diff > 0 ? '↑' : '↓';
		return { diff, cls, arrow };
	}

	const catSeries = $derived(
		cats.map((cat) => {
			const rows = weighIns.filter((w) => w.cat_id === cat.id);
			const series = sevenDayAverageSeries(rows);
			return { cat, series, delta: seriesDelta(series), lastChange: lastVsPreviousFor(cat.id) };
		})
	);

	const hasData = $derived(catSeries.some(({ series }) => series.length > 0));

	const chartData = $derived.by(() => {
		const dayMaps = catSeries.map(({ series }) => {
			const map = new Map();
			for (const point of series) map.set(dayKey(point.date), point.value);
			return map;
		});
		const allDays = new Set();
		dayMaps.forEach((map) => map.forEach((_, k) => allDays.add(k)));
		const days = [...allDays].sort();

		return {
			labels: days.map(formatLabel),
			datasets: catSeries.map(({ cat }, i) => ({
				label: cat.name,
				data: days.map((day) => (dayMaps[i].has(day) ? dayMaps[i].get(day) : null)),
				borderColor: cat.color,
				backgroundColor: cat.color,
				spanGaps: true,
				tension: 0.3,
				pointRadius: 2,
				borderWidth: 2
			}))
		};
	});

	$effect(() => {
		const data = chartData;
		if (!canvasEl || !hasData) return;
		if (chart) {
			chart.data = data;
			chart.update();
		} else {
			chart = new Chart(canvasEl, {
				type: 'line',
				data,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						y: { min: 4, max: 9, ticks: { callback: (v) => `${v} kg` } }
					}
				}
			});
		}
	});

	onDestroy(() => chart?.destroy());
</script>

<div class="graph-wrap">
	{#if hasData}
		<div class="canvas-box">
			<canvas bind:this={canvasEl}></canvas>
		</div>
		<div class="legend-list">

			{#each catSeries as { cat, delta, lastChange } (cat.id)}
			<div class="cat-legend">
				<div class="cat-header">
					<CatAvatar {cat} size={22} borderColor={cat.color} />
					<span class="name">{cat.name}</span>
				</div>
				{#if delta !== null}
				<span class="delta" class:up={delta > 0} class:down={delta < 0}>
					{delta === 0 ? '—' : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(2)} kg (weekly avg)`}
				</span>
				{/if}
				{#if lastChange}
				<span class="delta" class:up={lastChange.cls === 'up'} class:down={lastChange.cls === 'down'}>
					{lastChange.cls === 'flat'
						? '— no change'
						: `${lastChange.arrow} ${Math.abs(lastChange.diff).toFixed(2)} kg (vs last weigh-in)`}
				</span>
				{/if}
			</div>
			{/each}
		</div>
	{:else}
		<p class="empty">No weigh-ins yet. Log one to start the graph.</p>
	{/if}
</div>

<style>
	.graph-wrap {
		display: grid;
		
		gap: 16px;
		width: 100%;
	}

	.canvas-box {
		position: relative;
		height: 180px;
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	@media (min-width: 860px) {
		.graph-wrap {
			grid-template-columns: 1fr auto;
			align-items: stretch;
		}

		.canvas-box {
			flex: 1;
			height: auto;
			min-height: 220px;
		}

		.legend {
			flex-direction: column;
			flex-wrap: nowrap;
			gap: 0.6rem;
			width: 160px;
			flex-shrink: 0;
			padding-top: 0.25rem;
		}
		.legend-list {
			flex-direction: column;
			width: 100%;
			gap: 16px;
		}
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.name {
		color: var(--color-text);
		font-weight: 600;
	}
	.delta {
		font-size: 0.875em;
	}

	.delta.up {
		color: var(--color-danger);
	}

	.delta.down {
		color: var(--color-positive);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		padding: 1.5rem 0;
		text-align: center;
	}
	.cat-legend {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.cat-header {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.legend-list {
		display: flex;
		gap: 24px;

	}
</style>
