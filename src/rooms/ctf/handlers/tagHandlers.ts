import { CTFMatchRoom } from "../CTFMatchRoom";
import { CTFTagPayload } from "../protocol";

export async function handleTag(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFTagPayload> | undefined;
    if (typeof payload?.taggerName !== "string") {
        room.sendTo(playerId, { type: "tagResult", payload: { errorCode: 401, description: "taggerName must be a string" } });
        return;
    }
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "tagResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.handleTag(payload.taggerName);
    room.sendTo(playerId, { type: "tagResult", payload: result });
}
