import { CTFMatchRoom } from "../CTFMatchRoom";
import { Team } from "../../../common/types";
import { CTFJoinTeamPayload } from "../protocol";

export async function handleJoinTeam(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFJoinTeamPayload> | undefined;
    const team = payload?.team;
    if (team !== "North" && team !== "South") {
        room.sendTo(playerId, {
            type: "joinTeamResult",
            payload: { errorCode: 401, description: 'team must be "North" or "South"' },
        });
        return;
    }
    const error = await room.teamManager.movePlayerIntoTeam(playerId, team as Team);
    if (error !== undefined) {
        room.sendTo(playerId, { type: "joinTeamResult", payload: error });
        return;
    }
    room.sendTo(playerId, { type: "joinTeamResult", payload: { success: true } });
    room.broadcastPreGameUpdate();
}

export async function handleStartGame(room: CTFMatchRoom, playerId: string): Promise<void> {
    if (playerId !== room.hostPlayerId) {
        room.sendTo(playerId, {
            type: "startGameResult",
            payload: { errorCode: 403, description: "Only the match host can start the game" },
        });
        return;
    }
    await room.startGame();
    room.sendTo(playerId, { type: "startGameResult", payload: { success: true } });
    room.broadcastGameUpdate();
}
