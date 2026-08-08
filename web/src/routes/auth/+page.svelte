<script lang="ts">
	import { authClient } from '$lib/auth-client';

	const session = authClient.useSession;
</script>

<div>
	{#if $session.data}
		<div>
			<p>
				{$session.data.user.name}
			</p>
			<button
				onclick={async () => {
					await authClient.signOut();
				}}
			>
				Sign Out
			</button>
		</div>
	{:else}
		<button
			onclick={async () => {
				await authClient.signIn.social({
					provider: 'hackclub'
				});
			}}
		>
			Continue with Hackclub
		</button>
	{/if}
</div>
