import { CTFMatchRoom } from "../CTFMatchRoom";
import { CTFLocationPayload } from "../protocol";

export async function handleLocation(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFLocationPayload> | undefined;
    if (typeof payload?.lat !== "number" || typeof payload?.lng !== "number") {
        room.sendTo(playerId, {
            type: "locationResult",
            payload: { errorCode: 401, description: "lat and lng must both be numbers" },
        });
        return;
    }
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, {
            type: "locationResult",
            payload: { errorCode: 400, description: "Player not found in this match" },
        });
        return;
    }
    const error = await player.updateLocation(payload.lat, payload.lng);
    if (error !== undefined) {
        room.sendTo(playerId, { type: "locationResult", payload: error });
        return;
    }
    room.sendTo(playerId, { type: "locationResult", payload: { success: true } });
}
