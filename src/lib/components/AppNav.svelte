<script>
	import { page } from '$app/stores';

	const items = [
		{ href: '/', label: 'Home', exact: true },
		{ href: '/cats', label: 'Cats' },
		{ href: '/modules', label: 'Modules' },
		{ href: '/settings', label: 'Settings' }
	];

	function isActive(item, pathname) {
		return item.exact ? pathname === item.href : pathname.startsWith(item.href);
	}
</script>

{#snippet navIcon(label)}
	{#if label === 'Home'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M3 11.5 12 4l9 7.5" />
			<path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
		</svg>
	{:else if label === 'Cats'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path
				d="M4 9c0-1.5 1-4 2.5-5S9 3 9 5l.5 2h5L15 5c0-2 1-2 2.5-1S20 7.5 20 9c0 5-2 11-8 11S4 14 4 9Z"
			/>
			<circle cx="9.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
			<circle cx="14.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
			<path d="M10 14c.6.5 1.4.5 2 0" />
		</svg>
	{:else if label === 'Modules'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="4" y="4" width="7" height="7" rx="1.5" />
			<rect x="13" y="4" width="7" height="7" rx="1.5" />
			<rect x="4" y="13" width="7" height="7" rx="1.5" />
			<rect x="13" y="13" width="7" height="7" rx="1.5" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3" />
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
			/>
		</svg>
	{/if}
{/snippet}

<nav class="bottom-nav" aria-label="Primary">
	{#each items as item (item.href)}
		{@const active = isActive(item, $page.url.pathname)}
		<a href={item.href} class:active aria-current={active ? 'page' : undefined}>
			<span class="icon">{@render navIcon(item.label)}</span>
			<span class="label">{item.label}</span>
		</a>
	{/each}
</nav>

<nav class="side-nav" aria-label="Primary">
	<a class="brand" href="/">
		<span class="brand-emoji">🐱</span>
		<span class="brand-name">Katzen</span>
	</a>
	<div class="side-links">
		{#each items as item (item.href)}
			{@const active = isActive(item, $page.url.pathname)}
			<a href={item.href} class:active aria-current={active ? 'page' : undefined}>
				<span class="icon">{@render navIcon(item.label)}</span>
				<span class="label">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: var(--nav-height);
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		display: flex;
		padding-bottom: env(safe-area-inset-bottom);
		z-index: 20;
	}

	.bottom-nav a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
		color: var(--color-text-muted);
		font-size: 0.7rem;
	}

	.bottom-nav a.active {
		color: var(--color-primary);
	}

	.icon {
		width: 22px;
		height: 22px;
	}

	.icon svg {
		width: 100%;
		height: 100%;
	}

	.side-nav {
		display: none;
	}

	@media (min-width: 860px) {
		.bottom-nav {
			display: none;
		}

		.side-nav {
			display: flex;
			flex-direction: column;
			gap: 2rem;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: var(--sidebar-width);
			background: var(--color-surface);
			border-right: 1px solid var(--color-border);
			padding: 1.5rem 1rem;
			z-index: 20;
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0 0.5rem;
			text-decoration: none;
			color: var(--color-text);
			font-weight: 700;
			font-size: 1.1rem;
		}

		.brand-emoji {
			font-size: 1.4rem;
		}

		.side-links {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}

		.side-links a {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.65rem 0.75rem;
			border-radius: var(--radius-sm);
			text-decoration: none;
			color: var(--color-text-muted);
			font-weight: 600;
			font-size: 0.9rem;
		}

		.side-links a:hover {
			background: var(--color-bg);
			color: var(--color-text);
		}

		.side-links a.active {
			background: color-mix(in srgb, var(--color-primary) 16%, transparent);
			color: var(--color-primary);
		}

		.side-links .icon {
			width: 20px;
			height: 20px;
		}
	}
</style>
