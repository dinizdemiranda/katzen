<script>
	import { litterState } from '$lib/state/app.svelte.js';
	import { listWeighIns } from '$lib/api/weighIns.js';
	import { listIncidents } from '$lib/api/incidents.js';
	import { listAllAppointments } from '$lib/api/appointments.js';
	import { listEventCats } from '$lib/api/cats.js';
	import WeightGraph from '$lib/components/WeightGraph.svelte';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import WeighInModal from '$lib/components/WeighInModal.svelte';
	import IncidentModal from '$lib/components/IncidentModal.svelte';
	import EditIncidentModal from '$lib/components/EditIncidentModal.svelte';
	import AppointmentModal from '$lib/components/AppointmentModal.svelte';
	import EditAppointmentModal from '$lib/components/EditAppointmentModal.svelte';

	const WEIGHT_WINDOW_DAYS = 30;
	const POPOVER_WIDTH = 190;

	let weighIns = $state([]);
	let incidents = $state([]);
	let appointments = $state([]);
	let eventCats = $state([]);
	let loaded = $state(false);
	let showWeighInModal = $state(false);
	let showIncidentModal = $state(false);
	let showAppointmentModal = $state(false);
	let editingIncident = $state(null);
	let editingAppointment = $state(null);

	const today = new Date();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth());

	const monthLabel = $derived(
		new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
	);
	const isCurrentMonth = $derived(viewYear === today.getFullYear() && viewMonth === today.getMonth());

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear -= 1;
		} else {
			viewMonth -= 1;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear += 1;
		} else {
			viewMonth += 1;
		}
	}

	function goToday() {
		viewYear = today.getFullYear();
		viewMonth = today.getMonth();
	}

	let showTypeChooser = $state(false);
	let chooserDate = $state(null);
	let chooserPos = $state({ top: 0, left: 0 });
	let appointmentPrefill = $state(null);
	let incidentPrefill = $state(null);

	function openAddMenu(date, anchorEl) {
		if (date) {
			const now = new Date();
			date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), now.getHours(), now.getMinutes());
		}
		chooserDate = date;
		const rect = anchorEl.getBoundingClientRect();
		chooserPos = {
			top: rect.bottom + 6,
			left: Math.max(12, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12))
		};
		showTypeChooser = true;
	}

	function chooseAppointment() {
		showTypeChooser = false;
		appointmentPrefill = chooserDate;
		showAppointmentModal = true;
	}

	function chooseIncident() {
		showTypeChooser = false;
		incidentPrefill = chooserDate;
		showIncidentModal = true;
	}

	// Defers attaching the outside-click listener so the click that opened the popover
	// (still bubbling when this action mounts) doesn't immediately close it again.
	function clickOutside(node, callback) {
		function handleClick(event) {
			if (!node.contains(event.target)) callback();
		}
		const timer = setTimeout(() => document.addEventListener('click', handleClick, true), 0);
		return {
			destroy() {
				clearTimeout(timer);
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	async function loadData() {
		if (!litterState.litter) return;
		const [w, i, a, ec] = await Promise.all([
			listWeighIns(litterState.litter.id),
			listIncidents(litterState.litter.id),
			listAllAppointments(litterState.litter.id),
			listEventCats(litterState.litter.id)
		]);
		weighIns = w;
		incidents = i;
		appointments = a;
		eventCats = ec;
		loaded = true;
	}

	$effect(() => {
		if (litterState.ready) loadData();
	});

	const recentWeighIns = $derived.by(() => {
		const cutoff = Date.now() - WEIGHT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
		return weighIns.filter((w) => new Date(w.created_at).getTime() >= cutoff);
	});

	function catNameFor(catId) {
		return eventCats.find((c) => c.id === catId)?.name ?? 'Cat';
	}

	function catBirthdayFor(catId) {
		return eventCats.find((c) => c.id === catId)?.birthday ?? null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && showTypeChooser) showTypeChooser = false;
	}}
/>

<div class="dashboard">
	{#if litterState.litter}
		<p class="eyebrow">{litterState.litter.name}</p>
	{/if}

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
			<div class="card-header calendar-header-row">
				<div class="month-nav">
					<button class="nav-btn" onclick={prevMonth} aria-label="Previous month">‹</button>
					<span class="month-label">{monthLabel}</span>
					<button class="nav-btn" onclick={nextMonth} aria-label="Next month">›</button>
					<button class="today-btn" onclick={goToday} disabled={isCurrentMonth}>Today</button>
				</div>
				<button class="action" onclick={(e) => openAddMenu(null, e.currentTarget)}>+ Add Event</button>
			</div>
			<EventCalendar
				cats={eventCats}
				events={incidents}
				{appointments}
				{viewYear}
				{viewMonth}
				onSelectEvent={(ev) => {
					if (ev.kind === 'appointment') editingAppointment = ev;
					else editingIncident = ev;
				}}
				onSelectDay={(date, anchorEl) => openAddMenu(date, anchorEl)}
			/>
		</section>

		<section class="card">
			<div class="card-header">
				<h2>Weight Loss</h2>
				<button class="action" onclick={() => (showWeighInModal = true)}>+ Log weight</button>
			</div>
			<WeightGraph cats={litterState.cats} weighIns={recentWeighIns} allWeighIns={weighIns} />
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
	<IncidentModal
		cats={eventCats}
		prefillDate={incidentPrefill}
		onclose={() => (showIncidentModal = false)}
		oncreated={loadData}
	/>
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

{#if showAppointmentModal}
	<AppointmentModal
		cats={litterState.cats}
		prefillDate={appointmentPrefill}
		onclose={() => (showAppointmentModal = false)}
		oncreated={loadData}
	/>
{/if}

{#if editingAppointment}
	<EditAppointmentModal
		appointment={editingAppointment}
		catName={catNameFor(editingAppointment.cat_id)}
		catBirthday={catBirthdayFor(editingAppointment.cat_id)}
		onclose={() => (editingAppointment = null)}
		onsaved={loadData}
	/>
{/if}

{#if showTypeChooser}
	<div
		class="type-popover"
		style:top="{chooserPos.top}px"
		style:left="{chooserPos.left}px"
		use:clickOutside={() => (showTypeChooser = false)}
	>
		<button class="type-popover-option" onclick={chooseAppointment}>📅 Appointment</button>
		<button class="type-popover-option" onclick={chooseIncident}>🐾 Incident</button>
	</div>
{/if}

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1rem;
	}

	.eyebrow {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
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

	.calendar-header-row {
		flex-wrap: wrap;
	}

	.month-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.month-label {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.nav-btn {
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text);
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-btn:hover {
		border-color: var(--color-primary);
	}

	.today-btn {
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		cursor: pointer;
	}

	.today-btn:hover:not(:disabled) {
		border-color: var(--color-primary);
	}

	.today-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.type-popover {
		position: fixed;
		z-index: 1000;
		min-width: 190px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-card);
		padding: 0.35rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.type-popover-option {
		border: none;
		background: none;
		color: var(--color-text);
		font-size: 0.88rem;
		font-weight: 600;
		padding: 0.55rem 0.7rem;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
	}

	.type-popover-option:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
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
