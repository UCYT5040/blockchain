/* Meant to run in a secure location on a Command Computer
Used to relay messages between the web and Minecraft.
Left: Advanced monitor (for logs)
Top: Wireless modem
*/
import { NetworkAdapter, ProtocolEngine, PacketCategory, RPCRequestPayload, RPCResponsePayload, WirePacket } from "protocol";
import { MOTDCache, ServerKeyCache } from "./cache";
import { encryptText, blake2s, generateRandomHex } from "crypto";

term.redirect(peripheral.wrap("left") as MonitorPeripheral);

const SERVER_ID = "SERVER";
const network = new NetworkAdapter(100);
const protocol = new ProtocolEngine(SERVER_ID);
const keyCache = new ServerKeyCache("abc123");
const motdCache = new MOTDCache();

print(`[Server] Active and listening on channel 100...`);

while (true) {
  const packet = network.receivePacket();
  if (!packet || packet.header.dst !== SERVER_ID) continue;

  // Process incoming Requests
  if (packet.header.category === PacketCategory.REQUEST) {
    handleIncomingRequest(packet);
  }
}

function handleIncomingRequest(packet: WirePacket) {
  const clientId = packet.header.src;
  
  // Fetch client master Key from cache or IRL API
  const masterKey = keyCache.getMasterKey(clientId);
  if (!masterKey) {
    print(`[Server] Rejecting request from unknown client: ${clientId}`);
    sendErrorResponse(packet, "Unknown client ID or master key not found on server");
    return;
  }

  // Unpack and verify incoming request payload
  const req = protocol.unpackPayload<RPCRequestPayload>(packet, masterKey);
  if (!req) {
    print(`[Server] Failed to verify request payload from ${clientId}`);
    sendErrorResponse(packet, "Failed to verify payload signature", masterKey);
    return;
  }

  print(`[Server] Processing request from ${clientId}`);

  // Dispatch action execution
  let responseData: unknown = null;
  let success = true;
  let errorMsg: string | undefined;

  switch (req.action) {
    case "contacts:get":
      responseData = { contacts: [{ id: "BOB_12", alias: "Bob" }, { id: "ALICE_84", alias: "Alice" }] };
      break;
    case "motd:get":
      const motd = motdCache.getMOTD();
      if (!motd) {
        success = false;
        errorMsg = "Failed to get MOTD";
      } else {
        responseData = { motd };
      }
      break;
    default:
      success = false;
      errorMsg = `Unknown action: ${req.action}`;
  }

  // Construct encrypted response envelope
  const responsePayload: RPCResponsePayload = {
    replyToNonce: packet.header.nonce,
    success,
    data: responseData,
    error: errorMsg
  };

  const rawJson = textutils.serialiseJSON(responsePayload);
  const iv = generateRandomHex(8);
  const payloadEnvelope = { ciphertext: encryptText(rawJson, masterKey, iv), iv };

  const responsePacket: WirePacket = {
    header: {
      v: 1,
      category: PacketCategory.RESPONSE,
      src: SERVER_ID,
      dst: clientId,
      nonce: generateRandomHex(8),
      ts: os.epoch("utc"),
      ttl: 5,
      enc: true
    },
    payload: payloadEnvelope
  };

  // Send response back to wire
  print(`[Server] Sending encrypted response to ${clientId}`);
  network.sendPacket(responsePacket);
}

function sendErrorResponse(requestPacket: WirePacket, errorMsg: string, masterKey?: string) {
  if (!masterKey) return;
  const responsePayload: RPCResponsePayload = {
    replyToNonce: requestPacket.header.nonce,
    success: false,
    error: errorMsg
  };
  const rawJson = textutils.serialiseJSON(responsePayload);
  const iv = generateRandomHex(8);
  const responsePacket: WirePacket = {
    header: {
      v: 1,
      category: PacketCategory.RESPONSE,
      src: SERVER_ID,
      dst: requestPacket.header.src,
      nonce: generateRandomHex(8),
      ts: os.epoch("utc"),
      ttl: 5,
      enc: true
    },
    payload: { ciphertext: encryptText(rawJson, masterKey, iv), iv }
  };
  print(`[Server] Sending encrypted error response to ${requestPacket.header.src}`);
  network.sendPacket(responsePacket);
}