<script>
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { MODULES } from '$lib/modules.js';
</script>

<AppHeader title="Modules" />

<div class="modules-page">
	<p class="hint">These modules show up on your dashboard. More are coming soon.</p>
	{#each MODULES as mod (mod.id)}
		<div class="module-card">
			<div>
				<h2>{mod.name}</h2>
				<p>{mod.description}</p>
			</div>
			<label class="switch" title="Always enabled for now">
				<input type="checkbox" checked disabled />
				<span class="track"><span class="thumb"></span></span>
			</label>
		</div>
	{/each}
</div>

<style>
	.modules-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0 1.25rem 1rem;
	}

	.hint {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	.module-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1rem 1.1rem;
	}

	.module-card h2 {
		font-size: 1rem;
	}

	.module-card p {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin-top: 0.25rem;
	}

	.switch {
		position: relative;
		flex-shrink: 0;
	}

	.switch input {
		position: absolute;
		opacity: 0;
	}

	.track {
		display: block;
		width: 42px;
		height: 24px;
		border-radius: 999px;
		background: var(--color-primary);
		opacity: 0.5;
		position: relative;
	}

	.thumb {
		position: absolute;
		top: 3px;
		right: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
	}
</style>
