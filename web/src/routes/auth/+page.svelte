<script lang="ts">
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import PixelButton from '$lib/components/PixelButton.svelte';
	import PixelWindow from '$lib/components/PixelWindow.svelte';

	const session = authClient.useSession;
</script>

<div class="page">
	<main>
		{#if $session.data}
			<PixelWindow class="main-window">
				<h1>Account</h1>
				<p>
					{$session.data.user.name}
				</p>
				<p>
					Trying to access your projects? That feature is coming soon. In the meantime, check out
					the <a href={resolve('/docs')}>docs</a>!
				</p>
				<PixelButton
					onclick={async () => {
						await authClient.signOut();
					}}
				>
					Sign Out
				</PixelButton>
			</PixelWindow>
		{:else}
			<PixelWindow class="main-window">
				<h1>Log in or sign up</h1>
				<PixelButton
					advanced={true}
					onclick={async () => {
						await authClient.signIn.social({
							provider: 'hackclub'
						});
					}}
				>
					Continue with Hackclub
				</PixelButton>
			</PixelWindow>
		{/if}
	</main>
</div>

<style>
	.page {
		display: flex;
		width: 100%;
		height: 100vh;
		align-items: center;
		justify-content: center;
	}

	:global(.main-window) {
		width: 50vw;
		height: 50vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
</style>
