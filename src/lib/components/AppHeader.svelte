<script>
	let { title = '', backHref = '', children } = $props();
</script>

<header>
	{#if backHref}
		<a href={backHref} class="back" aria-label="Back">‹</a>
	{:else}
		<a href="/" class="logo" aria-label="Go to dashboard">🐱</a>
	{/if}
	<h1>{title}</h1>
	<span class="spacer"></span>
	{@render children?.()}
</header>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--color-bg);
	}

	.logo {
		font-size: 1.4rem;
		text-decoration: none;
		line-height: 1;
	}

	@media (min-width: 860px) {
		.logo {
			display: none;
		}
	}

	.back {
		font-size: 1.6rem;
		line-height: 1;
		text-decoration: none;
		color: var(--color-text);
		width: 1.5rem;
		text-align: center;
	}

	h1 {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.spacer {
		flex: 1;
	}
</style>
