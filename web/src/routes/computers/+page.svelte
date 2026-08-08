<script lang="ts">
	import { resolve } from '$app/paths';

	const { data, form } = $props();
</script>

<h1>Computers</h1>

{#if data.computers && data.computers.length > 0}
	<table>
		<thead>
			<tr>
				<th>Client ID</th>
				<th>Master Key</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.computers as computer (computer.id)}
				<tr>
					<td><code>{computer.clientId}</code></td>
					<td><code>{computer.masterKey}</code></td>
					<td>
						<form action="?/deleteComputer" method="POST">
							<input type="hidden" name="computerId" value={computer.id} />
							<input type="submit" value="Delete" />
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if data.showMasterKeys}
		<a href={resolve('/computers?showMasterKeys=false')}>Hide Master Keys</a>
	{:else}
		<a href={resolve('/computers?showMasterKeys=true')}>Show Master Keys</a>
	{/if}
{/if}

<form action="?/registerComputer" method="POST">
	<input type="submit" value="Register New Computer" />
</form>

{#if form && form.success && form.action === 'registerComputer'}
	<p>Computer registered.</p>
	<p>
		Client ID: <code>{form.computer?.clientId}</code>
	</p>
	<p>
		Master Key: <code>{form.computer?.masterKey}</code>
	</p>
{/if}
