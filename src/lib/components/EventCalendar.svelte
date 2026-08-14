<script>
	import Modal from '$lib/components/Modal.svelte';
	import CatAvatar from '$lib/components/CatAvatar.svelte';
	import { buildTrailingCalendar, buildMonthGrid, monthsInRange, dayKey } from '$lib/utils/calendarDays.js';
	import { incidentCountTrend } from '$lib/utils/incidentTrend.js';
	import { incidentTypeInfo, contentLabel, amountLabel } from '$lib/incidentOptions.js';
	import { litterState } from '$lib/state/app.svelte.js';

	let { cats, events, periodDays, onSelectEvent } = $props();

	const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	const MONTH_WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

	const todayKey = dayKey(new Date());
	const isDetailView = $derived(periodDays <= 30);

	const calendar = $derived(buildTrailingCalendar(periodDays));

	const monthBlocks = $derived.by(() => {
		if (isDetailView) return [];
		return monthsInRange(calendar.days).map(({ year, month }) => ({
			year,
			month,
			label: new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
			...buildMonthGrid(year, month)
		}));
	});

	const eventsByDay = $derived.by(() => {
		const map = new Map();
		for (const ev of events) {
			const key = dayKey(ev.created_at);
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(ev);
		}
		return map;
	});

	// Cats with an indicator: real cats always (so "0 events" is visible too), the
	// Unknown cat only when it actually has history — otherwise it'd always show.
	const legendCats = $derived(cats.filter((cat) => !cat.is_unknown || events.some((e) => e.cat_id === cat.id)));

	let daySummary = $state(null);

	function catFor(catId) {
		return cats.find((c) => c.id === catId);
	}

	function typeInfo(incident) {
		return incidentTypeInfo(incident, litterState.incidentTypes);
	}

	/** What to show as the descriptor: puke content for pukes, the type's label otherwise. */
	function descriptor(incident) {
		if (incident.type === 'puke') return contentLabel(incident.content);
		return typeInfo(incident).label;
	}

	function tagLabel(ev) {
		const { emoji } = typeInfo(ev);
		const prefix = emoji ? `${emoji} ` : '';
		return `${prefix}${catFor(ev.cat_id)?.name ?? 'Unknown'} - ${descriptor(ev)}`;
	}

	function tooltipHeadline(ev) {
		if (ev.type === 'puke') return `${contentLabel(ev.content)} · ${amountLabel(ev.amount)}`;
		return typeInfo(ev).label;
	}

	function summaryText(ev) {
		const { emoji } = typeInfo(ev);
		const prefix = emoji ? `${emoji} ` : '';
		const name = catFor(ev.cat_id)?.name ?? 'Unknown';
		if (ev.type === 'puke') {
			return `${prefix}${name} - ${contentLabel(ev.content)} · ${amountLabel(ev.amount)}`;
		}
		return `${prefix}${name} - ${descriptor(ev)}`;
	}

	function dayLabel(date) {
		const month = date.toLocaleDateString(undefined, { month: 'short' });
		return `${month} ${String(date.getDate()).padStart(2, '0')}`;
	}

	function timeLabel(iso) {
		return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function monthIndexOf(date) {
		return date.getFullYear() * 12 + date.getMonth();
	}

	function openDay(day, dayEvents) {
		if (dayEvents.length === 0) return;
		if (dayEvents.length === 1) {
			onSelectEvent(dayEvents[0]);
			return;
		}
		daySummary = { label: day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }), events: dayEvents };
	}

	function selectFromSummary(ev) {
		daySummary = null;
		onSelectEvent(ev);
	}
</script>

<div class="calendar-wrap">
	<div class="calendar-main">
		{#if isDetailView}
			<div class="weekday-row">
				{#each WEEKDAY_LABELS as label (label)}
					<span>{label}</span>
				{/each}
			</div>

			<div class="day-grid">
				{#each { length: calendar.leadingPad } as _, i (i)}
					<div class="cell empty"></div>
				{/each}
				{#each calendar.days as day (day.getTime())}
					{@const key = dayKey(day)}
					{@const dayEvents = eventsByDay.get(key) ?? []}
					<div
						class="cell"
						class:today={key === todayKey}
						class:month-alt={monthIndexOf(day) % 2 === 1}
					>
						<span class="day-label">{dayLabel(day)}</span>
						{#if dayEvents.length > 0}
							<div class="tags">
								{#each dayEvents as ev (ev.id)}
									<button
										class="tag"
										style:--tag-color={catFor(ev.cat_id)?.color ?? 'var(--color-text-muted)'}
										onclick={() => onSelectEvent(ev)}
									>
										<span class="tag-label">{tagLabel(ev)}</span>
										<span class="tag-tooltip">
											<strong>{tooltipHeadline(ev)}</strong>
											<span>{timeLabel(ev.created_at)}</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="month-grid">
				{#each monthBlocks as block (`${block.year}-${block.month}`)}
					<div class="mini-month">
						<p class="mini-month-title">{block.label}</p>
						<div class="mini-weekday-row">
							{#each MONTH_WEEKDAY_LABELS as label, i (i)}
								<span>{label}</span>
							{/each}
						</div>
						<div class="mini-day-grid">
							{#each { length: block.leadingPad } as _, i (i)}
								<span class="mini-cell empty"></span>
							{/each}
							{#each block.days as day (day.getTime())}
								{@const key = dayKey(day)}
								{@const dayEvents = eventsByDay.get(key) ?? []}
								<button
									class="mini-cell"
									class:today={key === todayKey}
									class:has-events={dayEvents.length > 0}
									disabled={dayEvents.length === 0}
									onclick={() => openDay(day, dayEvents)}
								>
									{day.getDate()}
									{#if dayEvents.length > 0}
										<span class="mini-dots">
											{#each dayEvents.slice(0, 4) as ev (ev.id)}
												<span class="mini-dot" style:background={catFor(ev.cat_id)?.color ?? 'var(--color-text-muted)'}></span>
											{/each}
										</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if legendCats.length > 0}
		<div class="legend-list">

			{#each legendCats as cat (cat.id)}
			{@const trend = incidentCountTrend(events, cat.id, periodDays)}
			<div class="cat-legend">

				<div class="cat-header">
					<CatAvatar {cat} size={22} borderColor={cat.color} />
					<span class="name">{cat.name}</span>
				</div>

				<span class="delta" class:up={trend.cls === 'up'} class:down={trend.cls === 'down'}>
					{trend.arrow}
					{trend.count} {trend.count === 1 ? 'event' : 'events'}
				</span>
			</div>
			{/each}
		</div>

	{/if}
</div>

{#if daySummary}
	<Modal title={daySummary.label} onclose={() => (daySummary = null)}>
		<ul class="day-summary-list">
			{#each daySummary.events as ev (ev.id)}
				<li>
					<button class="summary-row" onclick={() => selectFromSummary(ev)}>
						<span class="dot" style:background={catFor(ev.cat_id)?.color ?? 'var(--color-text-muted)'}></span>
						<span class="summary-text">{summaryText(ev)}</span>
						<span class="summary-time">{timeLabel(ev.created_at)}</span>
					</button>
				</li>
			{/each}
		</ul>
	</Modal>
{/if}

<style>
	.calendar-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.delta {
		font-size: 0.875em;
	}

	.calendar-main {
		flex: 1;
		min-width: 0;
	}

	.weekday-row {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
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
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 3px;
	}

	.cell {
		border-radius: 6px;
		background: var(--color-bg);
		padding: 3px 4px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-height: 64px;
	}

	.cell.empty {
		background: none;
	}

	.cell.month-alt {
		background: color-mix(in srgb, var(--color-bg) 55%, var(--color-surface));
	}

	.cell.today {
		outline: 1.5px solid gray;
		outline-offset: -1.5px;
	}

	.day-label {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--color-text-muted);
		opacity: 0.6;
		padding: 0 4px;

		text-align: center;
	}

	.tags {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.tag {
		position: relative;
		display: block;
		width: 100%;
		text-align: left;
		border: none;
		border-radius: 4px;
		padding: 1px 4px;
		background: color-mix(in srgb, var(--tag-color) 22%, transparent);
		color: var(--tag-color);
		font-size: 0.6rem;
		font-weight: 600;
		line-height: 1.4;
		cursor: pointer;
	}

	.tag-label {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag-tooltip {
		display: none;
		flex-direction: column;
		gap: 0.15rem;
		position: absolute;
		bottom: 100%;
		left: 0;
		margin-bottom: 4px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 0.4rem 0.6rem;
		white-space: nowrap;
		color: var(--color-text);
		font-size: 0.7rem;
		box-shadow: var(--shadow-card);
		z-index: 10;
	}

	.tag-tooltip strong {
		font-weight: 700;
	}

	.tag-tooltip span {
		color: var(--color-text-muted);
	}

	.tag:hover .tag-tooltip,
	.tag:focus-visible .tag-tooltip {
		display: flex;
	}

	.month-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.mini-month {
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: 0.55rem;
	}

	.mini-month-title {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: 0.35rem;
	}

	.mini-weekday-row {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		margin-bottom: 2px;
	}

	.mini-weekday-row span {
		text-align: center;
		font-size: 0.55rem;
		color: var(--color-text-muted);
	}

	.mini-day-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 1px;
	}

	.mini-cell {
		aspect-ratio: 1;
		border: none;
		background: none;
		border-radius: 4px;
		font-size: 0.6rem;
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		padding: 0;
		cursor: default;
	}

	.mini-cell.has-events {
		cursor: pointer;
		color: var(--color-text);
		font-weight: 700;
	}

	.mini-cell.today {
		outline: 1.5px solid var(--color-primary);
		outline-offset: -1.5px;
	}

	.mini-dots {
		display: flex;
		gap: 1px;
	}

	.mini-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
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
		gap: 0.4rem;
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

	.day-summary-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.day-summary-list li {
		border-top: 1px solid var(--color-border);
	}

	.day-summary-list li:first-child {
		border-top: none;
	}

	.summary-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.summary-text {
		flex: 1;
		font-size: 0.85rem;
	}

	.summary-time {
		color: var(--color-text-muted);
		font-size: 0.78rem;
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

	@media (min-width: 860px) {
		.calendar-wrap {
			flex-direction: row;
			align-items: stretch;
		}
		.day-label {

		text-align: start;
		}

		.legend-list {
			flex-direction: column;
			gap: 16px;
		}

		.legend {
			flex-direction: column;
			flex-wrap: nowrap;
			gap: 0.6rem;
			min-width: 160px;
			flex-shrink: 0;
			padding-top: 0.25rem;
		}
	}
</style>
