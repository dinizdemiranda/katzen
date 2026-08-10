<script>
	import InitialsAvatar from '$lib/components/InitialsAvatar.svelte';
	import { getInitials } from '$lib/utils/initials.js';

	let { cat, size = 56 } = $props();
</script>

{#if cat.photo_url}
	<img class="photo" src={cat.photo_url} alt={cat.name} style:width="{size}px" style:height="{size}px" />
{:else}
	<InitialsAvatar text={getInitials(cat.name)} color={cat.color} size={size} />
{/if}

<style>
	.photo {
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}
</style>
