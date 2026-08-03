import { pretty_print } from "cc.pretty";

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

export interface WirePacket {
  header: PacketHeader;
  payload: EncryptedPayload;
}

export class NetworkAdapter {
  private modem: ModemPeripheral;
  private channel: number;

  constructor(channel = 100) {
    this.channel = channel;
    // Find any available wireless or wired modem
    const peripherals = peripheral.find("modem");
    if (!peripherals || peripherals.length === 0) {
      throw new Error("No modem peripheral attached to computer.");
    }
    this.modem = peripherals[0] as ModemPeripheral;
    // Open channel to listen for traffic
    this.modem.open(this.channel);
  }

  /** Transmit a raw wire packet across the modem channel */
  public sendPacket(packet: WirePacket): void {
    // CC:T modem.transmit(channel, replyChannel, payload)
    const jsonString = textutils.serialiseJSON(packet);
    this.modem.transmit(this.channel, this.channel, jsonString);
  }

  /**
   * Listens for the next valid WirePacket on the modem event queue.
   * Yields execution using os.pullEvent("modem_message").
   */
  public receivePacket(): WirePacket | null {
    // Pull event from ComputerCraft OS queue
    const [event, side, senderChannel, replyChannel, message] = os.pullEvent("modem_message");
    
    if (senderChannel !== this.channel) return null;

    try {
      const packet = textutils.unserialiseJSON(message, { parse_null: true }) as WirePacket;
      if (packet && packet.header && packet.header.v === 1) {
        return packet;
      }
    } catch {
      // Ignore malformed raw modem frames
    }
    return null;
  }
}