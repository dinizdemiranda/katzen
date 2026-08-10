<script>
	import { auth } from '$lib/state/app.svelte.js';
	import { goto } from '$app/navigation';

	$effect(() => {
		if (auth.ready) {
			goto(auth.session ? '/' : '/login');
		}
	});
</script>

<div class="callback">
	<p>Signing you in…</p>
</div>

<style>
	.callback {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
	}
</style>
