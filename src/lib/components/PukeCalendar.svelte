<script>
	import { buildTrailingCalendar, dayKey } from '$lib/utils/calendarDays.js';
	import { contentLabel, amountLabel } from '$lib/vomitOptions.js';

	let { cats, events, onSelectEvent } = $props();

	const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	const { days, leadingPad } = buildTrailingCalendar(30);
	const todayKey = dayKey(new Date());

	const eventsByDay = $derived.by(() => {
		const map = new Map();
		for (const ev of events) {
			const key = dayKey(ev.created_at);
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(ev);
		}
		return map;
	});

	const legendCats = $derived(cats.filter((cat) => events.some((e) => e.cat_id === cat.id)));

	function catFor(catId) {
		return cats.find((c) => c.id === catId);
	}

	function eventTitle(ev) {
		const cat = catFor(ev.cat_id);
		return `${cat?.name ?? 'Unknown'} — ${contentLabel(ev.content)}, ${amountLabel(ev.amount)}`;
	}
</script>

<div class="calendar-wrap">
	<div class="calendar-main">
		<p class="summary">
			{events.length}
			{events.length === 1 ? 'puke' : 'pukes'} in the past 30 days
		</p>

		<div class="weekday-row">
			{#each WEEKDAY_LABELS as label (label)}
				<span>{label}</span>
			{/each}
		</div>

		<div class="day-grid">
			{#each { length: leadingPad } as _, i (i)}
				<div class="cell empty"></div>
			{/each}
			{#each days as day (day.getTime())}
				{@const key = dayKey(day)}
				{@const dayEvents = eventsByDay.get(key) ?? []}
				<div class="cell" class:today={key === todayKey}>
					<span class="day-num">{day.getDate()}</span>
					{#if dayEvents.length > 0}
						<div class="dots">
							{#each dayEvents as ev (ev.id)}
								<button
									class="dot"
									style:background={catFor(ev.cat_id)?.color ?? 'var(--color-text-muted)'}
									title={eventTitle(ev)}
									aria-label={eventTitle(ev)}
									onclick={() => onSelectEvent(ev)}
								></button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if legendCats.length > 0}
		<ul class="legend">
			{#each legendCats as cat (cat.id)}
				<li>
					<span class="dot-legend" style:background={cat.color}></span>
					<span class="name">{cat.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.calendar-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.calendar-main {
		flex: 1;
		min-width: 0;
	}

	.summary {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.6rem;
	}

	.weekday-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 0.3rem;
	}

	.weekday-row span {
		text-align: center;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.day-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 3px;
	}

	.cell {
		aspect-ratio: 1;
		border-radius: 6px;
		background: var(--color-bg);
		padding: 3px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow: hidden;
	}

	.cell.empty {
		background: none;
	}

	.cell.today {
		outline: 1.5px solid var(--color-primary);
		outline-offset: -1.5px;
	}

	.day-num {
		font-size: 0.62rem;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.dots {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		align-items: center;
	}

	.dot {
		width: 7px;
		height: 7px;
		min-width: 7px;
		padding: 0;
		border: none;
		border-radius: 50%;
		cursor: pointer;
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

	.dot-legend {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.name {
		color: var(--color-text);
		font-weight: 600;
	}

	@media (min-width: 860px) {
		.calendar-wrap {
			flex-direction: row;
			align-items: stretch;
		}

		.legend {
			flex-direction: column;
			flex-wrap: nowrap;
			gap: 0.6rem;
			width: 160px;
			flex-shrink: 0;
			padding-top: 1.75rem;
		}
	}
</style>
