/** @noSelfInFile */
import { NetworkAdapter, ProtocolEngine, PacketCategory, type RPCResponsePayload } from "protocol";

export class ClientAPI {
  private network: NetworkAdapter;
  private protocol: ProtocolEngine;
  private masterKey: string;
  private serverId: string;

  constructor(clientId: string, masterKey: string, serverId = "SERVER") {
    this.network = new NetworkAdapter(100);
    this.protocol = new ProtocolEngine(clientId);
    this.masterKey = masterKey;
    this.serverId = serverId;
  }

  /**
   * Continuously listens for incoming network packets and dispatches responses.
   * Runs in parallel with client operations using parallel.waitForAny/waitForAll.
   */
  public listen(): void {
    while (true) {
      const responsePacket = this.network.receivePacket();
      if (responsePacket && responsePacket.header.category === PacketCategory.RESPONSE) {
        const resData = this.protocol.unpackPayload<RPCResponsePayload>(responsePacket, this.masterKey);
        if (resData) {
          this.protocol.handleResponse(resData);
        }
      }
    }
  }

  /**
   * Issues an RPC request to the Server and returns a Promise for the response.
   */
  public request(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const { packet, nonce } = this.protocol.createRequestPacket(
      this.serverId, 
      action, 
      params, 
      this.masterKey
    );

    // Send packet to wire
    this.network.sendPacket(packet);

    // Register callback for matching response and return pending promise
    return new Promise((resolve, reject) => {
      this.protocol.registerPendingRequest(nonce, (res: RPCResponsePayload) => {
        if (res && res.success) {
          resolve(res.data);
        } else {
          reject(new Error((res && res.error) || "RPC Request failed"));
        }
      });
    });
  }
}