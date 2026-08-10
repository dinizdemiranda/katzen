<script>
	import { goto } from '$app/navigation';
	import { auth, litterState, loadLitter } from '$lib/state/app.svelte.js';
	import AppNav from '$lib/components/AppNav.svelte';

	let { children } = $props();

	$effect(() => {
		if (auth.ready && !auth.session) {
			goto('/login');
		}
	});
</script>

{#if !auth.ready || !auth.session || !litterState.ready}
	<div class="loading">
		<p>Loading…</p>
	</div>
{:else if litterState.error}
	<div class="loading">
		<p class="error">{litterState.error}</p>
		<button onclick={loadLitter}>Try again</button>
	</div>
{:else}
	<div class="app-shell">
		{@render children()}
	</div>
	<AppNav />
{/if}

<style>
	.loading {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--color-text-muted);
		padding: 1.5rem;
		text-align: center;
	}

	.error {
		color: var(--color-danger);
	}

	.loading button {
		border: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-weight: 600;
		padding: 0.65rem 1.25rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.app-shell {
		padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 1rem);
		min-height: 100dvh;
	}

	@media (min-width: 860px) {
		.app-shell {
			padding-bottom: 0;
			margin-left: var(--sidebar-width);
		}
	}
</style>
