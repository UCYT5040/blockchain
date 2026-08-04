/** @noSelfInFile */
import { write, writeLine } from "@shared/term";
import { ClientAPI } from "./api";

export interface ChatMessage {
  sender: string;
  content: string;
  timestamp: number;
}

export class ChatStore {
  private conversations = new Map<string, ChatMessage[]>();
  private unreadCounts = new Map<string, number>();
  private activePeer: string | null = null;

  public setActivePeer(peerId: string | null): void {
    this.activePeer = peerId;
    if (peerId) {
      this.unreadCounts.set(peerId, 0);
    }
  }

  public getActivePeer(): string | null {
    return this.activePeer;
  }

  public addMessage(peerId: string, sender: string, content: string): void {
    let thread = this.conversations.get(peerId);
    if (!thread) {
      thread = [];
      this.conversations.set(peerId, thread);
    }
    thread.push({
      sender,
      content,
      timestamp: os.epoch("utc")
    });

    if (this.activePeer !== peerId) {
      const currentUnread = this.unreadCounts.get(peerId) || 0;
      this.unreadCounts.set(peerId, currentUnread + 1);
    }
  }

  public getThread(peerId: string): ChatMessage[] {
    return this.conversations.get(peerId) || [];
  }

  public getActivePeers(): string[] {
    const peers: string[] = [];
    this.conversations.forEach((_, key) => {
      peers.push(key);
    });
    return peers;
  }

  public getUnreadCount(peerId: string): number {
    return this.unreadCounts.get(peerId) || 0;
  }

  public clearUnread(peerId: string): void {
    this.unreadCounts.set(peerId, 0);
  }
}

export const globalChatStore = new ChatStore();

/**
 * Initializes global background listener for incoming P2P direct messages.
 */
export function initChatListener(client: ClientAPI): void {
  client.onP2PMessage((src: string, payload) => {
    if (payload && payload.content) {
      globalChatStore.addMessage(src, src, payload.content);
    }
  });
}

/**
 * Opens the chat menu
 */
export function openChatMenu(client: ClientAPI): void {
  while (true) {
    term.clear();
    term.setCursorPos(1, 1);
    writeLine(term, "P2P Chat Messenger");

    const peers = globalChatStore.getActivePeers();
    if (peers.length === 0) {
      writeLine(term, "No active conversations.");
    } else {
      writeLine(term, "Active Chats:");
      for (let i = 0; i < peers.length; i++) {
        const peer = peers[i];
        const unread = globalChatStore.getUnreadCount(peer);
        const unreadStr = unread > 0 ? ` (${unread} unread)` : "";
        writeLine(term, `[${i + 1}] ${peer}${unreadStr}`);
      }
    }

    writeLine(term, "");
    writeLine(term, "[N] Start New Chat");
    writeLine(term, "[B] Back to Main Menu");
    write(term, "Select option: ");

    const choice = read().trim();

    if (choice.toUpperCase() === "B" || choice === "") {
      break;
    } else if (choice.toUpperCase() === "N") {
      write(term, "Enter target Client ID: ");
      const peerId = read().trim();
      if (peerId !== "") {
        openChatThread(client, peerId);
      }
    } else {
      const idx = parseInt(choice, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= peers.length) {
        const peerId = peers[idx - 1];
        openChatThread(client, peerId);
      }
    }
  }
}

/**
 * Opens an active chat thread with a specific peer.
 */
export function openChatThread(client: ClientAPI, peerId: string): void {
  globalChatStore.setActivePeer(peerId);

  while (true) {
    term.clear();
    term.setCursorPos(1, 1);
    writeLine(term, `Chat with ${peerId}`);
    writeLine(term, "Enter message to send, or '/back' to exit.\n");

    const thread = globalChatStore.getThread(peerId);
    if (thread.length === 0) {
      writeLine(term, "(No messages yet)");
    } else {
      for (let i = 0; i < thread.length; i++) {
        const msg = thread[i];
        const senderLabel = msg.sender === peerId ? peerId : "Me";
        writeLine(term, `[${senderLabel}]: ${msg.content}\n`);
      }
    }
    write(term, "> ");

    const input = read();
    if (input === "/back" || input === "/b") {
      break;
    }
    if (input.trim() !== "") {
      // Add message locally as 'Me'
      globalChatStore.addMessage(peerId, "Me", input);

      // Transmit P2P message
      client.sendP2P(peerId, input).catch((err) => {
        writeLine(term, `[Error sending message: ${err.message || String(err)}]`);
        os.sleep(1.5);
      });
    }
  }

  globalChatStore.setActivePeer(null);
}
