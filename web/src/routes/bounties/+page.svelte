<script lang="ts">
	import BountyBoard from '$lib/components/BountyBoard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<BountyBoard bounties={data.bounties} />
