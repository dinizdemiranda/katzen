<script>
	import { supabase } from '$lib/supabaseClient';
	import { auth } from '$lib/state/app.svelte.js';
	import { goto } from '$app/navigation';

	let mode = $state('signin'); // signin | signup
	let email = $state('');
	let password = $state('');
	let status = $state('idle'); // idle | working | confirm | error
	let errorMessage = $state('');

	$effect(() => {
		if (auth.ready && auth.session) {
			goto('/');
		}
	});

	function switchMode(next) {
		mode = next;
		status = 'idle';
		errorMessage = '';
	}

	async function submit(event) {
		event.preventDefault();
		status = 'working';
		errorMessage = '';

		if (mode === 'signin') {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});
			if (error) {
				status = 'error';
				errorMessage = error.message;
				return;
			}
			// auth.session updates via the onAuthStateChange listener; the $effect above redirects.
		} else {
			const { data, error } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
			});
			if (error) {
				status = 'error';
				errorMessage = error.message;
				return;
			}
			if (!data.session) {
				status = 'confirm';
				return;
			}
		}
	}
</script>

<div class="login-screen">
	<div class="login-card">
		<h1>🐱 Katzen</h1>
		<p class="subtitle">Track your cats' weight and wellness.</p>

		<div class="tabs">
			<button type="button" class:active={mode === 'signin'} onclick={() => switchMode('signin')}>
				Sign in
			</button>
			<button type="button" class:active={mode === 'signup'} onclick={() => switchMode('signup')}>
				Sign up
			</button>
		</div>

		{#if status === 'confirm'}
			<p class="sent">
				Check <strong>{email}</strong> for a confirmation link, then sign in.
			</p>
		{:else}
			<form onsubmit={submit}>
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} placeholder="you@example.com" required />

				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					minlength="6"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
					required
				/>

				{#if status === 'error'}
					<p class="error">{errorMessage}</p>
				{/if}

				<button type="submit" disabled={status === 'working'}>
					{#if status === 'working'}
						Working…
					{:else}
						{mode === 'signin' ? 'Sign in' : 'Create account'}
					{/if}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.login-screen {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.login-card {
		width: 100%;
		max-width: 360px;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 2rem;
		text-align: center;
	}

	h1 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-bottom: 1.5rem;
	}

	.tabs {
		display: flex;
		gap: 0.4rem;
		background: var(--color-bg);
		padding: 0.3rem;
		border-radius: 999px;
		margin-bottom: 1.25rem;
	}

	.tabs button {
		flex: 1;
		border: none;
		background: transparent;
		padding: 0.5rem;
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.tabs button:not(.active):hover {
		background: var(--color-surface);
	}

	.tabs button.active {
		background: var(--color-primary);
		color: var(--color-primary-text);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: left;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-top: 0.35rem;
	}

	input {
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
	}

	button[type='submit'] {
		margin-top: 0.75rem;
		padding: 0.75rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-weight: 600;
		cursor: pointer;
	}

	button[type='submit']:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.error {
		color: var(--color-danger);
		font-size: 0.85rem;
		margin: 0;
	}

	.sent {
		color: var(--color-text-muted);
	}
</style>
