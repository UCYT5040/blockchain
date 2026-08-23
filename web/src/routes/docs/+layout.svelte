<script lang="ts">
	let { children } = $props();
</script>

<main>
	{@render children()}
</main>

<style>
	main {
		margin: 1rem;
	}
</style>