import { CTFMatchRoom } from "../CTFMatchRoom";
import { CTFStartChallengePayload } from "../protocol";

export async function handleViewChallenges(room: CTFMatchRoom, playerId: string): Promise<void> {
    const challenges = await room.challengeManager.viewTop();
    room.sendTo(playerId, { type: "viewChallengesResult", payload: challenges });
}

export async function handleStartChallenge(room: CTFMatchRoom, playerId: string, rawPayload: unknown): Promise<void> {
    const payload = rawPayload as Partial<CTFStartChallengePayload> | undefined;
    if (typeof payload?.challengeTitle !== "string") {
        room.sendTo(playerId, { type: "startChallengeResult", payload: { errorCode: 401, description: "challengeTitle must be a string" } });
        return;
    }
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "startChallengeResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.startChallenge(payload.challengeTitle);
    room.sendTo(playerId, { type: "startChallengeResult", payload: result });
}

export async function handleFinishChallenge(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "finishChallengeResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const error = await player.finishChallenge();
    room.sendTo(playerId, { type: "finishChallengeResult", payload: error ?? { success: true } });
}

export async function handleVetoChallenge(room: CTFMatchRoom, playerId: string): Promise<void> {
    const player = room.playerManagers.get(playerId);
    if (player === undefined) {
        room.sendTo(playerId, { type: "vetoChallengeResult", payload: { errorCode: 400, description: "Player not found in this match" } });
        return;
    }
    const result = await player.vetoChallenge();
    room.sendTo(playerId, { type: "vetoChallengeResult", payload: result });
}
