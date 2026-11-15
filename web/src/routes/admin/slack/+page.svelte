<script lang="ts">
	const { data, form } = $props();

	let dmPreferences: Record<string, boolean> | null = $state(null);
	$effect(() => {
		if (data.dmPreferences instanceof Promise) {
			data.dmPreferences.then((prefs) => {
				dmPreferences = prefs;
			});
		} else {
			dmPreferences = data.dmPreferences;
		}
	});
</script>

<h1>Slack Management</h1>

<h2>Channel Members</h2>

<ul>
	{#each data.channelMembers as member (member.id)}
		<li>{member.displayName} ({member.id})</li>
	{/each}
</ul>

<h2>RSVP Data</h2>

{#if form && form.rsvpNames && dmPreferences}
	<ul>
		{#each form.rsvpNames as name (name)}
			<li>{name}</li>
		{/each}
	</ul>

	<h3>Send DMs</h3>

	<form action="?/sendDMs" method="post">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Send DM?</th>
					<th>Notes</th>
				</tr>
			</thead>
			<tbody>
				{#each data.channelMembers as member (member.id)}
					{@const hasRSVP = form.rsvpNames.includes(member.displayName)}
					{#if !hasRSVP}
						<tr>
							<td>{member.displayName}</td>
							<td>
								<input
									type="checkbox"
									name="sendDMs"
									value={member.id}
									checked={dmPreferences[member.id] ?? false}
								/>
							</td>
							<td>{(dmPreferences[member.id] ?? true) ? '' : 'Opted out'}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>

		<button type="submit">Send DMs</button>
	</form>
{:else}
	{#if form?.error}
		<p>{form.error}</p>
	{/if}

	<form action="?/rsvp" method="post">
		<label
			>Cookie from <a href="https://rsvp.soon.it/blockchain/manage">RSVP</a>:
			<input type="password" name="cookie" /></label
		>
		<button type="submit">Fetch RSVP Data</button>
	</form>
{/if}
