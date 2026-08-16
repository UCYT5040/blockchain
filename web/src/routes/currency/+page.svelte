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
			{#each data.transactions as transaction (transaction.id)}
				{@const authStatus = transaction.fields['Needs Auth']
					? transaction.fields['Processed']
						? transaction.fields['Authorized']
							? 'Authorized'
							: 'Denied'
						: transaction.fields['Authorized']
							? 'Authorized; Pending'
							: 'Pending Authorization'
					: 'Consented'}
				<tr>
					<td>{transaction.id}</td>
					<td>{transaction.fields['Note'] ?? 'No note'}</td>
					<td>{transaction.fields['Name (from From)'] ?? 'Unknown'}</td>
					<td>{transaction.fields['Name (from To)'] ?? 'Unknown'}</td>
					<td>{transaction.fields['Amount'] ?? 'Unknown'}</td>
					<td>{authStatus}</td>
					<td>{transaction.fields['Error'] ?? 'No error'}</td>
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
