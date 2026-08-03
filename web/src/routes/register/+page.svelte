<script lang="ts">
    const {data} = $props();
</script>

<h1>Registration</h1>

<table>
    <tbody>
        <tr>
            <td>
                Client ID
            </td>
            <td>
                <input readonly value={data.clientId} />
            </td>
        </tr>
        <tr>
            <td>
                Master Key
            </td>
            <td>
                <input readonly value={data.masterKey} />
            </td>
        </tr>
    </tbody>
</table>