<script>
	import { toasts, dismissToast } from '$lib/state/toast.svelte.js';
</script>

<div class="toast-host">
	{#each toasts as toast (toast.id)}
		<button class="toast" class:error={toast.type === 'error'} onclick={() => dismissToast(toast.id)}>
			{toast.message}
		</button>
	{/each}
</div>

<style>
	.toast-host {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1rem;
		z-index: 50;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		max-width: 360px;
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-positive);
		color: var(--color-text);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		box-shadow: var(--shadow-card);
		font-size: 0.85rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		animation: toast-in 0.2s ease;
	}

	.toast.error {
		border-left-color: var(--color-danger);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
