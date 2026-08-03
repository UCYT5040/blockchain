export enum PacketCategory {
  DATA = 0x01,       // Raw / Chat / Async Messages (No response expected)
  REQUEST = 0x02,    // RPC-style Request (Expects a RESPONSE)
  RESPONSE = 0x03,   // RPC-style Response matching a request nonce
  SIGNAL = 0x04      // Ping, Ack, Keepalive, Error
}

export interface PacketHeader {
  v: number;               // Protocol Version (e.g., 1)
  category: PacketCategory;// High-level handling category
  src: string;             // Originator (e.g., "ALICE_84", "SERVER")
  dst: string;             // Target (e.g., "BOB_12", "SERVER", or "BROADCAST")
  nonce: string;           // Unique message ID / Replay prevention
  ts: number;              // Timestamp (epoch ms)
  ttl: number;             // Time-To-Live hop count for relays
  enc: boolean;            // Encrypted payload flag
}

export interface EncryptedPayload {
  ciphertext: string;      // AEAD Ciphertext (Base64/Hex)
  iv: string;              // Cipher Initialization Vector
}

export interface SignedPayload {
  body: string;            // Serialized Plaintext JSON (Readable by Relays)
  sig: string;             // Ed25519 / HMAC signature over (Header + Body)
}

export interface WirePacket {
  header: PacketHeader;
  payload: EncryptedPayload | SignedPayload;
}

// ============================================================================
// Inner Payload Models (Serialized into `body` or `ciphertext`)
// ============================================================================

/**
 * Generic RPC Request Payload (Used for P2S or P2P commands)
 */
export interface RPCRequestPayload {
  action: string;          // Action identifier (e.g., "contacts:get", "kdc:get_ticket", "weather:fetch")
  params?: Record<string, unknown>; // Flexible parameter payload
}

/**
 * Generic RPC Response Payload
 */
export interface RPCResponsePayload {
  replyToNonce: string;    // Matches the request's header.nonce
  success: boolean;        // Operation status
  data?: unknown;          // Return data payload
  error?: string;          // Human-readable error message
}

/**
 * Generic Direct Message Payload (Chat, File Transfers, Notifications)
 */
export interface DirectMessagePayload {
  contentType: "text" | "json" | "binary";
  content: string;
}