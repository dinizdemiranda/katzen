<script>
	import { onDestroy } from 'svelte';
	import { Chart } from '$lib/chartSetup.js';

	let { cats, events, weeks = 8 } = $props();

	let canvasEl = $state();
	let chart;

	function mondayOf(date) {
		const d = new Date(date);
		const day = d.getDay();
		const diff = (day === 0 ? -6 : 1) - day;
		d.setDate(d.getDate() + diff);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	const hasData = $derived(events.length > 0);

	const chartData = $derived.by(() => {
		const todayMonday = mondayOf(new Date());
		const buckets = Array.from({ length: weeks }, (_, i) => {
			const d = new Date(todayMonday);
			d.setDate(d.getDate() - (weeks - 1 - i) * 7);
			return d;
		});
		const bucketKeys = buckets.map((d) => d.toISOString().slice(0, 10));
		const labels = buckets.map((d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

		return {
			labels,
			datasets: cats.map((cat) => {
				const rows = events.filter((e) => e.cat_id === cat.id);
				const counts = bucketKeys.map(
					(key) => rows.filter((e) => mondayOf(e.created_at).toISOString().slice(0, 10) === key).length
				);
				return { label: cat.name, data: counts, backgroundColor: cat.color, borderRadius: 4 };
			})
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
				type: 'bar',
				data,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						y: { beginAtZero: true, ticks: { stepSize: 1 } }
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
			{#each cats as cat (cat.id)}
				<li>
					<span class="dot" style:background={cat.color}></span>
					<span class="name">{cat.name}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">No puke events logged yet.</p>
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

	.empty {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		padding: 1.5rem 0;
		text-align: center;
	}
</style>
