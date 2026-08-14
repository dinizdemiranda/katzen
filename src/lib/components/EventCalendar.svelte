<script>
	import Modal from '$lib/components/Modal.svelte';
	import CatAvatar from '$lib/components/CatAvatar.svelte';
	import { buildMonthGrid, dayKey } from '$lib/utils/calendarDays.js';
	import { monthIncidentTrend } from '$lib/utils/incidentTrend.js';
	import { incidentTypeInfo, contentLabel, amountLabel } from '$lib/incidentOptions.js';
	import { appointmentTypeLabel } from '$lib/appointmentOptions.js';
	import { litterState } from '$lib/state/app.svelte.js';

	let { cats, events, appointments = [], viewYear, viewMonth, onSelectEvent, onSelectDay } = $props();

	const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	const MAX_VISIBLE_TAGS = 3;

	const todayKey = dayKey(new Date());

	const calendar = $derived(buildMonthGrid(viewYear, viewMonth));

	const allItems = $derived([
		...events.map((e) => ({ ...e, kind: 'incident', date: e.created_at })),
		...appointments.map((a) => ({ ...a, kind: 'appointment', date: a.scheduled_at }))
	]);

	const eventsByDay = $derived.by(() => {
		const map = new Map();
		for (const ev of allItems) {
			const key = dayKey(ev.date);
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

	function typeInfo(ev) {
		if (ev.kind === 'appointment') return { label: appointmentTypeLabel(ev.type), emoji: '📅' };
		return incidentTypeInfo(ev, litterState.incidentTypes);
	}

	/** What to show as the descriptor: appointment title, puke content, or the type's label. */
	function descriptor(ev) {
		if (ev.kind === 'appointment') return ev.title;
		if (ev.type === 'puke') return contentLabel(ev.content);
		return typeInfo(ev).label;
	}

	function tagLabel(ev) {
		const { emoji } = typeInfo(ev);
		const prefix = emoji ? `${emoji} ` : '';
		return `${prefix}${catFor(ev.cat_id)?.name ?? 'Unknown'} - ${descriptor(ev)}`;
	}

	function tooltipHeadline(ev) {
		return descriptor(ev);
	}

	function tooltipSubtext(ev) {
		const time = timeLabel(ev.date);
		if (ev.kind === 'appointment') {
			const meta = ev.address ? `${appointmentTypeLabel(ev.type)} · ${ev.address}` : appointmentTypeLabel(ev.type);
			return `${meta} · ${time}`;
		}
		if (ev.type === 'puke') return `${amountLabel(ev.amount)} · ${time}`;
		return time;
	}

	function summaryText(ev) {
		const { emoji } = typeInfo(ev);
		const prefix = emoji ? `${emoji} ` : '';
		const name = catFor(ev.cat_id)?.name ?? 'Unknown';
		if (ev.kind === 'incident' && ev.type === 'puke') {
			return `${prefix}${name} - ${contentLabel(ev.content)} · ${amountLabel(ev.amount)}`;
		}
		return `${prefix}${name} - ${descriptor(ev)}`;
	}

	function timeLabel(iso) {
		return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function openDaySummary(date, dayEvents) {
		daySummary = { label: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }), events: dayEvents };
	}

	function selectFromSummary(ev) {
		daySummary = null;
		onSelectEvent(ev);
	}

	function selectTag(event, ev) {
		event.stopPropagation();
		onSelectEvent(ev);
	}

	function showMore(event, date, dayEvents) {
		event.stopPropagation();
		openDaySummary(date, dayEvents);
	}
</script>

<div class="calendar-wrap">
	<div class="calendar-main">
		<div class="weekday-row">
			{#each WEEKDAY_LABELS as label (label)}
				<span>{label}</span>
			{/each}
		</div>

		<div class="day-grid">
			{#each calendar.days as day (day.date.getTime())}
				{@const key = dayKey(day.date)}
				{@const dayEvents = eventsByDay.get(key) ?? []}
				<div
					class="cell"
					class:today={key === todayKey}
					class:other-month={!day.inCurrentMonth}
					role="button"
					tabindex="0"
					aria-label={`Add event on ${day.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
					onclick={(e) => onSelectDay?.(day.date, e.currentTarget)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSelectDay?.(day.date, e.currentTarget);
						}
					}}
				>
					<span class="day-label">{day.date.getDate()}</span>
					{#if dayEvents.length > 0}
						<div class="tags">
							{#each dayEvents.slice(0, MAX_VISIBLE_TAGS) as ev (ev.id)}
								<button
									class="tag"
									style:--tag-color={catFor(ev.cat_id)?.color ?? 'var(--color-text-muted)'}
									onclick={(e) => selectTag(e, ev)}
								>
									<span class="tag-label">{tagLabel(ev)}</span>
									<span class="tag-tooltip">
										<strong>{tooltipHeadline(ev)}</strong>
										<span>{tooltipSubtext(ev)}</span>
									</span>
								</button>
							{/each}
							{#if dayEvents.length > MAX_VISIBLE_TAGS}
								<button class="tag more-tag" onclick={(e) => showMore(e, day.date, dayEvents)}>
									+{dayEvents.length - MAX_VISIBLE_TAGS} more
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if legendCats.length > 0}
		<div class="legend-list">
			{#each legendCats as cat (cat.id)}
				{@const trend = monthIncidentTrend(events, cat.id, viewYear, viewMonth)}
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
						<span class="summary-time">{timeLabel(ev.date)}</span>
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
		min-height: 68px;
		cursor: pointer;
	}

	.cell:hover {
		background: color-mix(in srgb, var(--color-bg) 70%, var(--color-surface));
	}

	.cell.today {
		outline: 1.5px solid gray;
		outline-offset: -1.5px;
	}

	.cell.other-month {
		background: color-mix(in srgb, var(--color-bg) 45%, transparent);
	}

	.cell.other-month:hover {
		background: color-mix(in srgb, var(--color-bg) 60%, transparent);
	}

	.cell.other-month .day-label {
		opacity: 0.3;
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

	.more-tag {
		background: none;
		color: var(--color-text-muted);
		font-weight: 700;
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

		.legend-list {
			flex-direction: column;
			gap: 16px;
			min-width: 160px;
			flex-shrink: 0;
			padding-top: 0.25rem;
		}
	}
</style>
