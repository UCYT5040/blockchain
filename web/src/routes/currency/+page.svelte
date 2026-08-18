<script lang="ts">
	const { data } = $props();
</script>

<h1>Currency</h1>

<p>Your balance: {data.balance}</p>

{#if data.transactions && data.transactions.length > 0}
	<table>
		<thead>
			<tr>
				<th>Transaction ID</th>
				<th>Note</th>
				<th>From</th>
				<th>To</th>
				<th>Amount</th>
				<th>Authorization</th>
				<th>Error</th>
			</tr>
		</thead>
		<tbody>
			{#each data.transactions as transaction (transaction['Transaction ID'])}
				{@const authStatus = transaction['Needs Auth']
					? transaction['Processed']
						? transaction['Authorized']
							? 'Authorized'
							: 'Denied'
						: transaction['Authorized']
							? 'Authorized; Pending'
							: 'Pending Authorization'
					: 'Consented'}
				<tr>
					<td>{transaction['Transaction ID']}</td>
					<td>{transaction['Note'] ?? 'No note'}</td>
					<td>{transaction['Name (from From)'] ?? 'Unknown'}</td>
					<td>{transaction['Name (from To)'] ?? 'Unknown'}</td>
					<td>{transaction['Amount'] ?? 'Unknown'}</td>
					<td>{authStatus}</td>
					<td>{transaction['Error'] ?? 'No error'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>You haven't made any transactions</p>
{/if}

<details>
	<summary>How do transactions work?</summary>
	<p>Transactions are simply the transfer of currency from one person to another.</p>
	<p>
		<strong>Consented Transactions</strong>: When you send money from yourself to another person.
		The transaction is immediately processed.
	</p>
	<p>
		<strong>Unconsented Transactions</strong>: When you request money from another person. The
		transaction is processed once the other person approves it and you then request processing.
	</p>
	<p>
		<strong>Declined Transactions:</strong> Balances are only checked upon processing. This means a transaction
		could still decline even if both parties approved it.
	</p>
</details>
