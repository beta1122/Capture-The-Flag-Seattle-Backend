import { CTFMatchRoom } from "../CTFMatchRoom";
import { CTFUseTicketPayload } from "../protocol";

export async function handleUseTicket(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFUseTicketPayload> | undefined;
    if (typeof payload?.num !== "number") {
        room.sendTo(playerId, { type: "useTicketResult", payload: { errorCode: 401, description: "num must be a number" } });
        return;
    }
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "useTicketResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const error = await player.useTicket(payload.num);
    room.sendTo(playerId, { type: "useTicketResult", payload: error ?? { success: true } });
}

export async function handleUseInvisPot(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "useInvisPotResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.useInvisPot();
    room.sendTo(playerId, { type: "useInvisPotResult", payload: result });
}

export async function handleUseDoublePowerup(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "useDoublePowerupResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.useDoublePowerup();
    room.sendTo(playerId, { type: "useDoublePowerupResult", payload: result });
}

export async function handleUpdateCoins(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "updateCoinsResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.updateCoins();
    room.sendTo(playerId, { type: "updateCoinsResult", payload: result });
}
