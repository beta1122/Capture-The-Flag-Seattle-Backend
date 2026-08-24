import WebSocket from "ws";

type ConnectedClient = {
    playerId: string,
    socket: WebSocket,
}

// Generic per-match room: owns the WebSocket connections for one match and the
// game-agnostic parts of its lifecycle (connect/disconnect/send/broadcast/dispatch).
// Game-specific state and message handling belong in a subclass, e.g. CTFMatchRoom.
// A future second game mode gets its own subclass without touching this file or the
// room registry.
export abstract class GameRoom<TServerMessage> {
    readonly roomCode: string;
    protected clients: Map<string, ConnectedClient> = new Map();

    constructor(roomCode: string) {
        this.roomCode = roomCode;
    }

    registerClient(playerId: string, socket: WebSocket): void {
        this.clients.set(playerId, { playerId, socket });
        socket.on("close", () => {
            this.clients.delete(playerId);
            this.onDisconnect(playerId);
        });
        socket.on("message", (raw) => this.dispatchRawMessage(playerId, raw));
    }

    sendTo(playerId: string, message: TServerMessage): void {
        const client = this.clients.get(playerId);
        if (client === undefined || client.socket.readyState !== WebSocket.OPEN) return;
        client.socket.send(JSON.stringify(message));
    }

    broadcast(message: TServerMessage, exceptPlayerId?: string): void {
        const json = JSON.stringify(message);
        for (const client of this.clients.values()) {
            if (client.playerId === exceptPlayerId) continue;
            if (client.socket.readyState !== WebSocket.OPEN) continue;
            client.socket.send(json);
        }
    }

    private dispatchRawMessage(playerId: string, raw: WebSocket.RawData): void {
        let message: unknown;
        try {
            message = JSON.parse(raw.toString());
        } catch {
            return;
        }
        this.handleMessage(playerId, message);
    }

    // Called for every parsed incoming message; subclasses dispatch by message.type.
    protected abstract handleMessage(playerId: string, message: unknown): void;

    // Optional hook for game-specific reactions to a dropped connection
    // (e.g. removing a player from a pregame lobby). No-op by default.
    protected onDisconnect(_playerId: string): void {}

    // Override to release any timers/resources held by the room.
    dispose(): void {}
}
