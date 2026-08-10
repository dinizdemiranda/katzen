<script>
	import '$lib/styles/app.css';
	import { initAuth, litterState } from '$lib/state/app.svelte.js';
	import ToastHost from '$lib/components/ToastHost.svelte';

	let { children } = $props();

	initAuth();
</script>

<svelte:head>
	<title>{litterState.litter?.name ?? 'Katzen'}</title>
</svelte:head>

{@render children()}

<ToastHost />
