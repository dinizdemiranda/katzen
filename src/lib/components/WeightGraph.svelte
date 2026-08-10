<script>
	import { onDestroy } from 'svelte';
	import { Chart } from '$lib/chartSetup.js';
	import { sevenDayAverageSeries, seriesDelta } from '$lib/utils/rollingAverage.js';

	let { cats, weighIns } = $props();

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

	const catSeries = $derived(
		cats.map((cat) => {
			const rows = weighIns.filter((w) => w.cat_id === cat.id);
			const series = sevenDayAverageSeries(rows);
			return { cat, series, delta: seriesDelta(series) };
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
						y: { ticks: { callback: (v) => `${v} kg` } }
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
		<ul class="legend">
			{#each catSeries as { cat, delta } (cat.id)}
				<li>
					<span class="dot" style:background={cat.color}></span>
					<span class="name">{cat.name}</span>
					{#if delta !== null}
						<span class="delta" class:up={delta > 0} class:down={delta < 0}>
							{delta === 0 ? '—' : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(2)} kg`}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">No weigh-ins yet. Log one to start the graph.</p>
	{/if}
</div>

<style>
	.graph-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	.legend li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.name {
		color: var(--color-text);
		font-weight: 600;
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
</style>
