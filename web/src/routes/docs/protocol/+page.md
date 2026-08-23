## :factory: ReplayFilter

### Methods

- [isReplayOrExpired](#gear-isreplayorexpired)
- [cleanup](#gear-cleanup)

#### :gear: isReplayOrExpired

Checks if a packet is a replay or has an expired timestamp.
Returns true if packet is invalid (replay or expired).
If valid, records the nonce and returns false.

| Method | Type |
| ---------- | ---------- |
| `isReplayOrExpired` | `(packet: WirePacket, now?: number) => boolean` |

#### :gear: cleanup

Purges nonces whose expiration timestamp has passed

| Method | Type |
| ---------- | ---------- |
| `cleanup` | `(now?: number) => void` |

## :factory: ProtocolEngine

### Methods

- [isReplayOrExpired](#gear-isreplayorexpired)
- [getReplayFilter](#gear-getreplayfilter)
- [createRequestPacket](#gear-createrequestpacket)
- [unpackPayload](#gear-unpackpayload)
- [registerPendingRequest](#gear-registerpendingrequest)
- [handleResponse](#gear-handleresponse)
- [createResponsePacket](#gear-createresponsepacket)
- [createDataPacket](#gear-createdatapacket)
- [createHandshakePacket](#gear-createhandshakepacket)
- [createTestPacket](#gear-createtestpacket)
- [createTestResponsePacket](#gear-createtestresponsepacket)

#### :gear: isReplayOrExpired

Checks if an incoming packet is a duplicate replay or expired

| Method | Type |
| ---------- | ---------- |
| `isReplayOrExpired` | `(packet: WirePacket) => boolean` |

#### :gear: getReplayFilter

Returns the internal ReplayFilter instance

| Method | Type |
| ---------- | ---------- |
| `getReplayFilter` | `() => ReplayFilter` |

#### :gear: createRequestPacket

Packs an RPC Request into an Encrypted WirePacket envelope.

| Method | Type |
| ---------- | ---------- |
| `createRequestPacket` | `(targetId: string, action: string, params: Record<string, unknown>, keyHex: string) => { packet: WirePacket; nonce: string; }` |

#### :gear: unpackPayload

Unpacks and decrypts an incoming packet's inner payload.

| Method | Type |
| ---------- | ---------- |
| `unpackPayload` | `<T>(packet: WirePacket, keyHex: string) => T or null` |

#### :gear: registerPendingRequest

Registers a callback listener for a specific request nonce

| Method | Type |
| ---------- | ---------- |
| `registerPendingRequest` | `(nonce: string, callback: (res: RPCResponsePayload) => void) => void` |

#### :gear: handleResponse

Resolves a pending RPC promise when a matching response arrives

| Method | Type |
| ---------- | ---------- |
| `handleResponse` | `(responsePayload: RPCResponsePayload) => void` |

#### :gear: createResponsePacket

Constructs an encrypted Response WirePacket.

| Method | Type |
| ---------- | ---------- |
| `createResponsePacket` | `(targetId: string, replyToNonce: string, success: boolean, data?: unknown, error?: string or undefined, keyHex?: string or undefined) => WirePacket` |

#### :gear: createDataPacket

Constructs an encrypted Data WirePacket (direct message / chat).

| Method | Type |
| ---------- | ---------- |
| `createDataPacket` | `(targetId: string, payload: DirectMessagePayload, keyHex: string) => WirePacket` |

#### :gear: createHandshakePacket

Constructs a P2P Ticket Handshake Signal WirePacket.
Delivered to target peer so target can decrypt the ticket using their master key.

| Method | Type |
| ---------- | ---------- |
| `createHandshakePacket` | `(targetId: string, ticket: string, ticketIv: string) => WirePacket` |

#### :gear: createTestPacket

Constructs an unencrypted SIGNAL Test Request WirePacket.

| Method | Type |
| ---------- | ---------- |
| `createTestPacket` | `(targetId: string, seq?: number, data?: string) => WirePacket` |

#### :gear: createTestResponsePacket

Constructs an unencrypted SIGNAL Test Response WirePacket with constant "pong" payload data.

| Method | Type |
| ---------- | ---------- |
| `createTestResponsePacket` | `(requestPacket: WirePacket, seq?: number) => WirePacket` |

## :tropical_drink: Interfaces

- [RPCRequestPayload](#gear-rpcrequestpayload)
- [RPCResponsePayload](#gear-rpcresponsepayload)
- [DirectMessagePayload](#gear-directmessagepayload)
- [P2PTicket](#gear-p2pticket)
- [TicketResponseBody](#gear-ticketresponsebody)
- [P2PHandshakePayload](#gear-p2phandshakepayload)
- [TestPacketPayload](#gear-testpacketpayload)

### :gear: RPCRequestPayload



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `action` | `string` |  |
| `params` | `Record<string, unknown> or undefined` |  |


### :gear: RPCResponsePayload



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `replyToNonce` | `string` |  |
| `success` | `boolean` |  |
| `data` | `unknown` |  |
| `error` | `string or undefined` |  |


### :gear: DirectMessagePayload



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `contentType` | `"text" or "json" or "binary"` |  |
| `content` | `string` |  |


### :gear: P2PTicket



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `sessionKey` | `string` |  |
| `initiatorId` | `string` |  |
| `timestamp` | `number` |  |
| `ttl` | `number` |  |


### :gear: TicketResponseBody



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `targetId` | `string` |  |
| `sessionKey` | `string` |  |
| `ticketForTarget` | `string` |  |
| `ticketIv` | `string` |  |


### :gear: P2PHandshakePayload



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `ticket` | `string` |  |
| `iv` | `string` |  |


### :gear: TestPacketPayload



| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `seq` | `number` |  |
| `data` | `string` |  |
| `ts` | `number` |  |

