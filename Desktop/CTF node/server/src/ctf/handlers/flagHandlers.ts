import { CTFMatchRoom } from "../CTFMatchRoom";
import { CTFTakeFlagPayload } from "../protocol";

export async function handleTakeFlag(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFTakeFlagPayload> | undefined;
    if (typeof payload?.flag !== "string") {
        room.sendTo(playerId, { type: "takeFlagResult", payload: { errorCode: 401, description: "flag must be a string" } });
        return;
    }
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "takeFlagResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const error = await player.takeFlag(payload.flag);
    room.sendTo(playerId, { type: "takeFlagResult", payload: error ?? { success: true } });
}

export async function handleCaptureFlag(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "captureFlagResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const error = await player.captureFlag();
    room.sendTo(playerId, { type: "captureFlagResult", payload: error ?? { success: true } });
}
