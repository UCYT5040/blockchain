/** @noSelfInFile */
import { 
  PacketCategory, 
  PacketHeader, 
  WirePacket, 
  EncryptedPayload, 
  NetworkAdapter 
} from "./network";
import { 
  encryptText, decryptText, blake2s, generateRandomHex, constantTimeCompare 
} from "crypto";

export interface RPCRequestPayload {
  action: string;          // Action identifier (e.g., "contacts:get", "kdc:get_ticket", "weather:fetch")
  params?: Record<string, unknown>; // Flexible parameter payload
}

export interface RPCResponsePayload {
  replyToNonce: string;    // Matches the request's header.nonce
  success: boolean;        // Operation status
  data?: unknown;          // Return data payload
  error?: string;          // Human-readable error message
}

export interface DirectMessagePayload {
  contentType: "text" | "json" | "binary";
  content: string;
}

export { 
  NetworkAdapter, 
  PacketCategory, 
  PacketHeader, 
  WirePacket, 
  EncryptedPayload 
};


export class ProtocolEngine {
  private myId: string;
  private pendingRequests = new Map<string, (response: RPCResponsePayload) => void>();

  constructor(myId: string) {
    this.myId = myId;
  }

  /**
   * Packs an RPC Request into an Encrypted WirePacket envelope.
   */
  public createRequestPacket(
    targetId: string, 
    action: string, 
    params: Record<string, unknown>, 
    keyHex: string
  ): { packet: WirePacket; nonce: string } {
    if (!keyHex) throw new Error("Encryption key required for packet creation.");

    const nonce = generateRandomHex(8);
    const header: PacketHeader = {
      v: 1,
      category: PacketCategory.REQUEST,
      src: this.myId,
      dst: targetId,
      nonce: nonce,
      ts: os.epoch("utc"),
      ttl: 5,
      enc: true
    };

    const innerPayload: RPCRequestPayload = { action, params };
    const rawJson = textutils.serialiseJSON(innerPayload);

    const iv = generateRandomHex(8);
    const ciphertext = encryptText(rawJson, keyHex, iv);
    const payloadEnvelope: EncryptedPayload = { ciphertext, iv };

    return {
      packet: { header, payload: payloadEnvelope },
      nonce
    };
  }

  /**
   * Unpacks and decrypts an incoming packet's inner payload.
   */
  public unpackPayload<T>(packet: WirePacket, keyHex: string): T | null {
    try {
      if (!keyHex) return null;
      const encPayload = packet.payload;
      if (!encPayload || !encPayload.ciphertext || !encPayload.iv) return null;

      const rawJson = decryptText(encPayload.ciphertext, keyHex, encPayload.iv);
      return textutils.unserialiseJSON(rawJson) as T;
    } catch {
      return null;
    }
  }

  /** Registers a callback listener for a specific request nonce */
  public registerPendingRequest(nonce: string, callback: (res: RPCResponsePayload) => void): void {
    this.pendingRequests.set(nonce, callback);
  }

  /** Resolves a pending RPC promise when a matching response arrives */
  public handleResponse(responsePayload: RPCResponsePayload): void {
    const callback = this.pendingRequests.get(responsePayload.replyToNonce);
    if (callback) {
      callback(responsePayload);
      this.pendingRequests.delete(responsePayload.replyToNonce);
    }
  }
}