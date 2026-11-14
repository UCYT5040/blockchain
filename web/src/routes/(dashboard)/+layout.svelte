<script lang="ts">
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<div class="body">
	<nav>
		<a href={resolve('/')}>BlockChain</a>
	</nav>
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.body {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.content {
		flex-grow: 1;
	}
</style>
