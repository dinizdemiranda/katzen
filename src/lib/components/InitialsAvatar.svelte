<script>
	let { text = '?', size = 40, color = 'var(--color-primary)' } = $props();
</script>

<span class="avatar" style:width="{size}px" style:height="{size}px" style:background={color} style:font-size="{size * 0.4}px">
	{text}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: #fff;
		font-weight: 700;
		flex-shrink: 0;
		user-select: none;
	}
</style>
