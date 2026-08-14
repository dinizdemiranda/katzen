<script>
	import { page } from '$app/stores';
	import { litterState } from '$lib/state/app.svelte.js';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CatAvatar from '$lib/components/CatAvatar.svelte';
	import EditCatModal from '$lib/components/EditCatModal.svelte';
	import EditWeighInModal from '$lib/components/EditWeighInModal.svelte';
	import EditIncidentModal from '$lib/components/EditIncidentModal.svelte';
	import EditAppointmentModal from '$lib/components/EditAppointmentModal.svelte';
	import { formatBirthday, formatAge } from '$lib/utils/catDates.js';
	import { listWeighInsForCat } from '$lib/api/weighIns.js';
	import { listIncidentsForCat } from '$lib/api/incidents.js';
	import { listAppointmentsForCat } from '$lib/api/appointments.js';
	import { weeklyAverageChange, weeklyChangeStatus } from '$lib/utils/weeklyChange.js';
	import { incidentTypeInfo, contentLabel, amountLabel } from '$lib/incidentOptions.js';
	import { appointmentTypeLabel } from '$lib/appointmentOptions.js';

	const cat = $derived(litterState.cats.find((c) => c.id === $page.params.id));

	let weighIns = $state([]);
	let incidents = $state([]);
	let appointments = $state([]);
	let loaded = $state(false);
	let historyFilter = $state('all');
	let appointmentTab = $state('upcoming');
	let showEditCat = $state(false);
	let editingWeighIn = $state(null);
	let editingIncident = $state(null);
	let editingAppointment = $state(null);

	async function loadHistory(catId) {
		loaded = false;
		const [w, i, a] = await Promise.all([
			listWeighInsForCat(catId),
			listIncidentsForCat(catId, 5),
			listAppointmentsForCat(catId)
		]);
		weighIns = w;
		incidents = i;
		appointments = a;
		loaded = true;
	}

	$effect(() => {
		if (cat) loadHistory(cat.id);
	});

	function formatDateTime(iso) {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function trendFor(current, previous) {
		if (previous === undefined || previous === null) return null;
		const diff = Number(current) - Number(previous);
		if (diff === 0) return { arrow: '→', cls: 'flat' };
		return { arrow: diff > 0 ? '↑' : '↓', cls: diff > 0 ? 'up' : 'down' };
	}

	function incidentSummary(incident) {
		const { label } = incidentTypeInfo(incident, litterState.incidentTypes);
		if (incident.type === 'puke') return `${contentLabel(incident.content)} · ${amountLabel(incident.amount)}`;
		return label;
	}

	const weeklyChange = $derived(weeklyAverageChange(weighIns));
	const weeklyStatus = $derived(weeklyChangeStatus(weeklyChange.percentLost));

	const lastWeighInChange = $derived.by(() => {
		if (weighIns.length < 2) return null;
		const diff = Number(weighIns[0].weight) - Number(weighIns[1].weight);
		const cls = diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down';
		const arrow = diff === 0 ? '→' : diff > 0 ? '↑' : '↓';
		return { diff, cls, arrow };
	});

	const recentWeighIns = $derived(
		weighIns.slice(0, 5).map((w, i) => ({ ...w, trend: trendFor(w.weight, weighIns[i + 1]?.weight) }))
	);

	const historyItems = $derived.by(() => {
		const weightItems = recentWeighIns.map((w) => ({ type: 'weight', date: w.created_at, weighIn: w }));
		const incidentItems = incidents.map((v) => ({ type: 'incident', date: v.created_at, incident: v }));

		let items;
		if (historyFilter === 'weight') items = weightItems;
		else if (historyFilter === 'incident') items = incidentItems;
		else items = [...weightItems, ...incidentItems].sort((a, b) => new Date(b.date) - new Date(a.date));

		return items.slice(0, 5);
	});

	const upcomingAppointments = $derived(
		appointments
			.filter((a) => new Date(a.scheduled_at) >= new Date())
			.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
	);

	const previousAppointments = $derived(
		appointments.filter((a) => new Date(a.scheduled_at) < new Date()).slice(0, 5)
	);

	const visibleAppointments = $derived(
		appointmentTab === 'upcoming' ? upcomingAppointments : previousAppointments
	);
</script>

<AppHeader title={cat?.name ?? 'Cat'} backHref="/cats">
	{#if cat}
		<button class="edit-btn" onclick={() => (showEditCat = true)}>Edit</button>
	{/if}
</AppHeader>

<div class="cat-page">
	{#if !cat}
		<div class="empty-state">
			<p>Couldn't find that cat.</p>
			<a href="/cats" class="cta">Back to Cats →</a>
		</div>
	{:else}
		<section class="card profile-header">
			<CatAvatar {cat} size={64} />
			<div>
				<h1>{cat.name}</h1>
				<p class="birthday">
					{formatBirthday(cat.birthday)}
					{#if cat.birthday}
						<span class="muted">· {formatAge(cat.birthday)}</span>
					{/if}
				</p>
				<p class="meta">
					{#if cat.gender}
						<span>{cat.gender === 'male' ? 'Male' : 'Female'}</span>
					{/if}
					{#if cat.microchip_number}
						<span>Microchip: {cat.microchip_number}</span>
					{/if}
				</p>
			</div>
		</section>

		<section class="card">
			<h2>Weight</h2>

			{#if !loaded}
				<p class="muted">Loading…</p>
			{:else if weighIns.length === 0}
				<p class="muted">No weigh-ins yet.</p>
			{:else}
				<div class="metrics-row">
					<div class="weekly-badge status-{weeklyStatus.color}">
						<span class="weekly-arrow">{weeklyStatus.arrow}</span>
						<div>
							<p class="weekly-label">{weeklyStatus.label}</p>
							<p class="weekly-sub">week over week avg</p>
						</div>
					</div>
					{#if lastWeighInChange}
						<div class="weekly-badge last-badge {lastWeighInChange.cls}">
							<span class="weekly-arrow">{lastWeighInChange.arrow}</span>
							<div>
								<p class="weekly-label">
									{lastWeighInChange.cls === 'flat'
										? 'No change'
										: `${Math.abs(lastWeighInChange.diff).toFixed(2)} kg`}
								</p>
								<p class="weekly-sub">vs. last weigh-in</p>
							</div>
						</div>
					{/if}
				</div>

				<ul class="weigh-in-list">
					{#each recentWeighIns as w (w.id)}
						<li>
							<button class="row-button" onclick={() => (editingWeighIn = w)}>
								<span class="wi-date">
									{formatDateTime(w.created_at)}
									{#if w.notes}<span class="note-flag" title={w.notes}>📝</span>{/if}
								</span>
								<span class="wi-weight">{Number(w.weight).toFixed(2)} kg</span>
								{#if w.trend}
									<span class="wi-trend trend-{w.trend.cls}">{w.trend.arrow}</span>
								{:else}
									<span class="wi-trend trend-flat">—</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card">
			<div class="card-header-row">
				<h2>History</h2>
				<div class="filter-tabs">
					<button class:active={historyFilter === 'all'} onclick={() => (historyFilter = 'all')}>
						All
					</button>
					<button class:active={historyFilter === 'weight'} onclick={() => (historyFilter = 'weight')}>
						Weight
					</button>
					<button class:active={historyFilter === 'incident'} onclick={() => (historyFilter = 'incident')}>
						Events
					</button>
				</div>
			</div>

			{#if !loaded}
				<p class="muted">Loading…</p>
			{:else if historyItems.length === 0}
				<p class="muted">No events yet.</p>
			{:else}
				<ul class="history-list">
					{#each historyItems as item (`${item.type}-${item.type === 'weight' ? item.weighIn.id : item.incident.id}`)}
						<li>
							<button
								class="row-button history-row"
								onclick={() =>
									item.type === 'weight'
										? (editingWeighIn = item.weighIn)
										: (editingIncident = item.incident)}
							>
								<span class="history-icon">
									{#if item.type === 'weight'}
										⚖️
									{:else}
										{incidentTypeInfo(item.incident, litterState.incidentTypes).emoji ?? '📋'}
									{/if}
								</span>
								<div class="history-body">
									{#if item.type === 'weight'}
										<p class="history-title">
											Weighed in at {Number(item.weighIn.weight).toFixed(2)} kg
											{#if item.weighIn.trend}
												<span class="wi-trend trend-{item.weighIn.trend.cls}">{item.weighIn.trend.arrow}</span>
											{/if}
											{#if item.weighIn.notes}<span class="note-flag" title={item.weighIn.notes}>📝</span>{/if}
										</p>
									{:else}
										<p class="history-title">
											{incidentSummary(item.incident)}
											{#if item.incident.notes}<span class="note-flag" title={item.incident.notes}>📝</span>{/if}
											{#if item.incident.photo_url}<span class="note-flag" title="Has a photo">📷</span>{/if}
										</p>
									{/if}
									<p class="history-date">{formatDateTime(item.date)}</p>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card">
			<div class="card-header-row">
				<h2>Appointments</h2>
				<div class="filter-tabs">
					<button class:active={appointmentTab === 'upcoming'} onclick={() => (appointmentTab = 'upcoming')}>
						Upcoming
					</button>
					<button class:active={appointmentTab === 'previous'} onclick={() => (appointmentTab = 'previous')}>
						Previous
					</button>
				</div>
			</div>

			{#if !loaded}
				<p class="muted">Loading…</p>
			{:else if visibleAppointments.length === 0}
				<p class="muted">
					{appointmentTab === 'upcoming' ? 'No upcoming appointments.' : 'No previous appointments.'}
				</p>
			{:else}
				<ul class="history-list">
					{#each visibleAppointments as appt (appt.id)}
						<li>
							<button class="row-button history-row" onclick={() => (editingAppointment = appt)}>
								<span class="history-icon">📅</span>
								<div class="history-body">
									<p class="history-title">
										{appt.title}
										{#if appt.notes}<span class="note-flag" title={appt.notes}>📝</span>{/if}
										{#if appt.appointment_documents?.length}
											<span class="note-flag" title="{appt.appointment_documents.length} document(s)">📄</span>
										{/if}
									</p>
									<p class="history-date">
										{formatDateTime(appt.scheduled_at)} · {appointmentTypeLabel(appt.type)}
										{#if appt.address}<span class="muted"> · {appt.address}</span>{/if}
									</p>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

{#if showEditCat && cat}
	<EditCatModal {cat} onclose={() => (showEditCat = false)} />
{/if}

{#if editingWeighIn}
	<EditWeighInModal
		weighIn={editingWeighIn}
		catName={cat.name}
		catBirthday={cat.birthday}
		onclose={() => (editingWeighIn = null)}
		onsaved={() => loadHistory(cat.id)}
	/>
{/if}

{#if editingIncident}
	<EditIncidentModal
		incident={editingIncident}
		catName={cat.name}
		catBirthday={cat.birthday}
		onclose={() => (editingIncident = null)}
		onsaved={() => loadHistory(cat.id)}
	/>
{/if}

{#if editingAppointment}
	<EditAppointmentModal
		appointment={editingAppointment}
		catName={cat.name}
		catBirthday={cat.birthday}
		onclose={() => (editingAppointment = null)}
		onsaved={() => loadHistory(cat.id)}
	/>
{/if}

<style>
	.cat-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0 1.25rem 1rem;
	}

	.card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.card h2 {
		font-size: 0.95rem;
	}

	.profile-header {
		flex-direction: row;
		align-items: center;
		gap: 1rem;
	}

	.profile-header h1 {
		font-size: 1.2rem;
	}

	.birthday {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin-top: 0.2rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin-top: 0.3rem;
	}

	.muted {
		color: var(--color-text-muted);
	}

	.metrics-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.metrics-row .weekly-badge {
		flex: 1;
		min-width: 140px;
	}

	.weekly-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.weekly-arrow {
		font-size: 1.5rem;
		font-weight: 700;
		width: 2rem;
		text-align: center;
		flex-shrink: 0;
	}

	.weekly-label {
		font-weight: 700;
		font-size: 0.95rem;
	}

	.weekly-sub {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		margin-top: 0.1rem;
	}

	.status-gray {
		background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
	}
	.status-gray .weekly-arrow,
	.status-gray .weekly-label {
		color: var(--color-text-muted);
	}

	.status-green {
		background: color-mix(in srgb, var(--color-positive) 14%, transparent);
	}
	.status-green .weekly-arrow,
	.status-green .weekly-label {
		color: var(--color-positive);
	}

	.status-yellow {
		background: color-mix(in srgb, var(--color-warning) 16%, transparent);
	}
	.status-yellow .weekly-arrow,
	.status-yellow .weekly-label {
		color: var(--color-warning);
	}

	.status-red {
		background: color-mix(in srgb, var(--color-danger) 14%, transparent);
	}
	.status-red .weekly-arrow,
	.status-red .weekly-label {
		color: var(--color-danger);
	}

	.last-badge.up {
		background: color-mix(in srgb, var(--color-danger) 14%, transparent);
	}
	.last-badge.up .weekly-arrow,
	.last-badge.up .weekly-label {
		color: var(--color-danger);
	}

	.last-badge.down {
		background: color-mix(in srgb, var(--color-positive) 14%, transparent);
	}
	.last-badge.down .weekly-arrow,
	.last-badge.down .weekly-label {
		color: var(--color-positive);
	}

	.last-badge.flat {
		background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
	}
	.last-badge.flat .weekly-arrow,
	.last-badge.flat .weekly-label {
		color: var(--color-text-muted);
	}

	.weigh-in-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.weigh-in-list li {
		border-top: 1px solid var(--color-border);
	}

	.weigh-in-list li:first-child {
		border-top: none;
	}

	.row-button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.weigh-in-list .row-button {
		font-size: 0.85rem;
	}

	.note-flag {
		margin-left: 0.3rem;
		font-size: 0.8rem;
		cursor: help;
	}

	.wi-date {
		flex: 1;
		color: var(--color-text-muted);
	}

	.wi-weight {
		font-weight: 600;
	}

	.wi-trend {
		width: 1.2rem;
		text-align: center;
		font-weight: 700;
	}

	.trend-up {
		color: var(--color-danger);
	}

	.trend-down {
		color: var(--color-positive);
	}

	.trend-flat {
		color: var(--color-text-muted);
	}

	.card-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filter-tabs {
		display: flex;
		gap: 0.3rem;
		background: var(--color-bg);
		padding: 0.25rem;
		border-radius: 999px;
	}

	.filter-tabs button {
		border: none;
		background: transparent;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.filter-tabs button:hover:not(.active) {
		color: var(--color-text);
	}

	.filter-tabs button.active {
		background: var(--color-primary);
		color: var(--color-primary-text);
	}

	.edit-btn {
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.45rem 0.85rem;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.history-list li {
		border-top: 1px solid var(--color-border);
	}

	.history-list li:first-child {
		border-top: none;
	}

	.history-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.history-body {
		flex: 1;
		min-width: 0;
	}

	.history-title {
		font-size: 0.88rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.history-date {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		margin-top: 0.1rem;
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
</style>
