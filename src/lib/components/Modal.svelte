<script>
	let { title = '', onclose, children } = $props();

	function onkeydown(event) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<div class="backdrop">
	<button class="backdrop-close" onclick={onclose} aria-label="Close"></button>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
		<div class="sheet-header">
			<h2>{title}</h2>
			<button class="close" onclick={onclose} aria-label="Close">✕</button>
		</div>
		<div class="sheet-body">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 30;
	}

	.backdrop-close {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
		padding: 0;
		background: rgba(20, 18, 15, 0.5);
		cursor: default;
	}

	.sheet {
		position: relative;
		width: 100%;
		max-width: 480px;
		max-height: 85dvh;
		overflow-y: auto;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 1.25rem;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.sheet-header h2 {
		font-size: 1.15rem;
	}

	.close {
		border: none;
		background: var(--color-bg);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
</style>
