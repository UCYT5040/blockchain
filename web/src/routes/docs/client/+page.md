## :wrench: Constants

- [client](#gear-client)

### :gear: client

| Constant | Type |
| ---------- | ---------- |
| `client` | `ClientAPI` |


## :factory: ClientAPI

### Constructors

`public`: Creates a new ClientAPI instance

Parameters:

* `clientId`: The client ID
* `masterKey`: The master key
* `serverId`: The server ID (default: 'SERVER')


### Methods

- [getSessionManager](#gear-getsessionmanager)
- [onP2PRequest](#gear-onp2prequest)
- [onP2PMessage](#gear-onp2pmessage)
- [establishP2PSession](#gear-establishp2psession)
- [listen](#gear-listen)
- [request](#gear-request)
- [requestP2P](#gear-requestp2p)
- [sendP2P](#gear-sendp2p)
- [listCurrency](#gear-listcurrency)
- [getBalance](#gear-getbalance)
- [transfer](#gear-transfer)
- [createTransaction](#gear-createtransaction)
- [authorizeTransaction](#gear-authorizetransaction)
- [processTransaction](#gear-processtransaction)

#### :gear: getSessionManager

| Method | Type |
| ---------- | ---------- |
| `getSessionManager` | `() => SessionManager` |

#### :gear: onP2PRequest

Registers a handler function for incoming P2P RPC requests from peers

| Method | Type |
| ---------- | ---------- |
| `onP2PRequest` | `(handler: (this: void, src: string, action: string, params: Record<string, unknown>) => unknown) => void` |

Parameters:

* `handler`: The handler function to register


#### :gear: onP2PMessage

Registers a handler function for incoming direct P2P data messages

| Method | Type |
| ---------- | ---------- |
| `onP2PMessage` | `(handler: (this: void, src: string, payload: DirectMessagePayload) => void) => void` |

Parameters:

* `handler`: The handler function to register


#### :gear: establishP2PSession

Requests a P2P ticket from the central KDC server and sends the handshake ticket to the target peer.

| Method | Type |
| ---------- | ---------- |
| `establishP2PSession` | `(peerId: string) => Promise<string>` |

#### :gear: listen

Continuously listens for incoming network packets and dispatches responses / P2P handlers.
Consider running in parallel using parallel.waitForAny / waitForAll.

| Method | Type |
| ---------- | ---------- |
| `listen` | `() => void` |

#### :gear: request

Issues an RPC request to the Server and returns a Promise for the response.

| Method | Type |
| ---------- | ---------- |
| `request` | `(action: string, params?: Record<string, unknown>) => Promise<unknown>` |

#### :gear: requestP2P

Issues an RPC request directly to a Peer computer using an encrypted P2P session key.
Automatically requests a session key from the server if one is not yet established.

| Method | Type |
| ---------- | ---------- |
| `requestP2P` | `(peerId: string, action: string, params?: Record<string, unknown>) => Promise<unknown>` |

#### :gear: sendP2P

Sends a direct encrypted message (chat/data) to a Peer computer using the shared P2P session key.
Automatically requests a session key from the server if one is not yet established.

| Method | Type |
| ---------- | ---------- |
| `sendP2P` | `(peerId: string, content: any) => Promise<void>` |

#### :gear: listCurrency

Retrieves the balance and transaction list for this client from the server.

| Method | Type |
| ---------- | ---------- |
| `listCurrency` | `() => Promise<CurrencyListResponse>` |

#### :gear: getBalance

Retrieves the current currency balance for this client.

| Method | Type |
| ---------- | ---------- |
| `getBalance` | `() => Promise<number>` |

#### :gear: transfer

Sends currency from this computer to a recipient computer.

| Method | Type |
| ---------- | ---------- |
| `transfer` | `(toClientId: string, amount: number, note?: string) => Promise<CurrencyActionResult>` |

#### :gear: createTransaction

Creates a currency transaction (direct transfer or payment request from another computer).

| Method | Type |
| ---------- | ---------- |
| `createTransaction` | `(toClientId: string, amount: number, note?: string, fromClientId?: string or undefined) => Promise<CurrencyActionResult>` |

#### :gear: authorizeTransaction

Authorizes a pending currency transaction where this client is the sender/payer.

| Method | Type |
| ---------- | ---------- |
| `authorizeTransaction` | `(transactionId: string) => Promise<CurrencyActionResult>` |

#### :gear: processTransaction

Processes an authorized currency transaction where this client is the recipient.

| Method | Type |
| ---------- | ---------- |
| `processTransaction` | `(transactionId: string) => Promise<CurrencyActionResult>` |
