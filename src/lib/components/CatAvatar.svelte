<script>
	import InitialsAvatar from '$lib/components/InitialsAvatar.svelte';
	import { getInitials } from '$lib/utils/initials.js';

	let { cat, size = 56, borderColor = null } = $props();
</script>

{#if borderColor}
	<span class="ring" style:border-color={borderColor} style:width="{size}px" style:height="{size}px">
		{#if cat.photo_url}
			<img class="photo" src={cat.photo_url} alt={cat.name} />
		{:else}
			<InitialsAvatar text={getInitials(cat.name)} color={cat.color} size={size - 4} />
		{/if}
	</span>
{:else if cat.photo_url}
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

	.ring {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 2px solid;
		box-sizing: border-box;
		flex-shrink: 0;
		overflow: hidden;
	}

	.ring .photo {
		width: 100%;
		height: 100%;
	}
</style>
