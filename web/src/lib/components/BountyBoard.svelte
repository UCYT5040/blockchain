<script lang="ts">
	import type { BountyBoardData } from '$lib/server/bounty';
	import CurrencyIcon from './icons/CurrencyIcon.svelte';
	import PixelWindow from './PixelWindow.svelte';

	let { bounties }: { bounties: BountyBoardData } = $props();

	let showHidden: boolean = $state(false);
</script>

<PixelWindow>
	<h2>Bounties</h2>
	<p>Complete bounties, and earn extra currency!</p>
	{#each bounties.availableBounties as bounty, i (bounty.id)}
		<div class="bounty">
			<div class="bounty-details">
				<span class="number">{i + 1}.</span>
				<div class="name-status">
					<span class="name">{bounty.name}</span>
					<span class="status">AVAILABLE</span>
				</div>

				<span class="requirements">{bounty.requirements}</span>
			</div>
			<div class="bounty-reward">
				<CurrencyIcon />
				<span>{bounty.reward}</span>
			</div>
		</div>
	{/each}
	<button class="toggle-claimed" onclick={() => (showHidden = !showHidden)}>
		{showHidden ? '- Hide Claimed Bounties' : '+ Show Claimed Bounties'}
	</button>
	{#if showHidden}
		{#each bounties.claimedBounties as bounty, i (bounty.id)}
			<div class="bounty claimed">
				<div class="bounty-details">
					<span class="number">{i + 1 + bounties.availableBounties.length}.</span>
					<div class="name-status">
						<span class="name">{bounty.name}</span>
						<span class="status">CLAIMED</span>
					</div>

					<span class="requirements">{bounty.requirements}</span>
				</div>
				<div class="bounty-reward">
					<CurrencyIcon />
					<span class="reward">{bounty.reward}</span>
					<span class="claimed-by">Claimed by {bounty.claimedBy!.name}</span>
				</div>
			</div>
		{/each}
	{/if}
</PixelWindow>

<style>
	.number {
		font-size: 2em;
		min-width: 1em;
	}

	.name-status {
		display: flex;
		justify-content: space-between;
		flex-direction: column;
	}

	.name {
		font-size: 1.5em;
		font-weight: bold;
		letter-spacing: -0.02em;
	}

	.bounty {
		display: flex;
		justify-content: space-between;
	}

	.bounty-details {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 1rem;
	}

	.bounty-reward {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.2rem;
	}

	.status {
		font-size: 0.6em;
		font-style: italic;
	}

	.requirements {
		font-size: 0.8em;
		font-style: italic;
		max-width: 40%;
	}

	.bounty.claimed {
		opacity: 0.8;
	}

	.bounty.claimed .reward {
		text-decoration: line-through;
	}

	.claimed-by {
		font-size: 0.8em;
		margin-left: 0.5rem;
	}

	.toggle-claimed {
		width: 100%;
		margin-top: 1rem;
		margin-bottom: 1rem;
		border: none;
		background: none;
		color: var(--color-text);
		font-size: 0.8em;
		cursor: pointer;
	}

	.toggle-claimed:hover {
		text-decoration: underline;
	}
</style>
