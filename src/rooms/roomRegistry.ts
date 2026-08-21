import { GameRoom } from "./GameRoom";

// Room registry: game-agnostic on purpose. It doesn't know CTFMatchRoom or any other
// specific room class - callers pass a factory, so a future second game mode plugs in
// without any change here.
const rooms: Map<string, GameRoom<unknown>> = new Map();

// Ambiguous-looking characters (0/O, 1/I) excluded so codes are easy to read/type aloud.
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 4;

function generateRoomCode(): string {
    let code: string;
    do {
        code = "";
        for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
            code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
        }
    } while (rooms.has(code));
    return code;
}

export function createRoom<T extends GameRoom<unknown>>(factory: (roomCode: string) => T): T {
    const roomCode = generateRoomCode();
    const room = factory(roomCode);
    rooms.set(roomCode, room);
    return room;
}

export function findRoomByCode<T extends GameRoom<unknown>>(code: string): T | undefined {
    return rooms.get(code.toUpperCase()) as T | undefined;
}

export function disposeRoom(code: string): void {
    const normalized = code.toUpperCase();
    const room = rooms.get(normalized);
    if (room === undefined) return;
    room.dispose();
    rooms.delete(normalized);
}
