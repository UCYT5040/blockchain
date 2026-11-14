<script lang="ts">
	import PixelButton from '$lib/components/PixelButton.svelte';

	let welcomeStage: number = $state(0);

	let canMoveBack: boolean = $derived(welcomeStage > 0);
	let canMoveForward: boolean = $derived.by(() => {
		switch (welcomeStage) {
			case 0:
				return true;
			case 1:
				return playOption !== null;
			default:
				return true;
		}
	});
	let canFinish = $derived(welcomeStage === 2);

	let playOption: null | 'trial' | 'minecraft' = $state(null);
</script>

<div class="body">
	<main>
		{#if welcomeStage === 0}
			<h1>Welcome to BlockChain!</h1>
			<p>TODO: add a cool GIF here</p>
		{:else if welcomeStage === 1}
			<h2>How will you play?</h2>
			<p>Select an option to continue:</p>
			<div class="play-options">
				<PixelButton
					class={`play-option ${playOption === 'trial' ? '' : 'unselected'}`}
					onclick={() => (playOption = 'trial')}
				>
					<h3>I need Minecraft!</h3>
					<p>Start as a trial player</p>
					<p>Create programs in the online simulator</p>
					<p>Unlock Minecraft after 6h of work</p>
				</PixelButton>
				<PixelButton
					class={`play-option ${playOption === 'minecraft' ? '' : 'unselected'}`}
					onclick={() => (playOption = 'minecraft')}
					advanced
				>
					<h3>I have Minecraft!</h3>
					<p>Join the server with your own Minecraft account</p>
				</PixelButton>
			</div>
		{:else if welcomeStage === 2}
			{#if playOption === 'trial'}
				<h2>Join as a trial player</h2>
				<p>TODO: Link to a guide</p>
			{:else if playOption === 'minecraft'}
				<h2>Join with your own Minecraft account</h2>
				<p>TODO: Link to a guide</p>
			{/if}
		{/if}
	</main>

	<div class="nav-buttons">
		<PixelButton
			disabled={!canMoveBack}
			class="nav-button"
			onclick={() => {
				if (canMoveBack) welcomeStage--;
			}}>Back</PixelButton
		>
		{#if canFinish}
			<form class="nav-button">
				<input type="hidden" name="playOption" value={playOption} />
				<PixelButton class="nav-form-button" advanced type="submit">Finish</PixelButton>
			</form>
		{:else}
			<PixelButton
				disabled={!canMoveForward}
				class="nav-button"
				advanced
				onclick={() => {
					if (canMoveForward) welcomeStage++;
				}}>Next</PixelButton
			>
		{/if}
	</div>
</div>

<style>
	.body {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	main {
		flex-grow: 1;
		margin: 1em;
		display: flex;
		flex-direction: column;
	}

	.nav-buttons {
		display: flex;
		justify-content: space-between;
	}

	.play-options {
		display: flex;
		gap: 1em;
		justify-content: center;
		flex-grow: 1;
	}

	:global(.play-option) {
		flex-grow: 1;
		height: 100%;
	}

	:global(.nav-button) {
		min-width: 30%;
	}

	:global(.nav-form-button) {
		width: 100%;
	}

	:global(.unselected) {
		filter: grayscale(0.5) brightness(0.8);
	}
</style>
