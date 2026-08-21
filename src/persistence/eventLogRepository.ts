import Database from "better-sqlite3";
import { Event } from "../common/types";

export type MatchSummary = {
    matchId: string,
    roomCode: string,
    startTime: number,
    endTime: number,
    northScore: number,
    southScore: number,
}

// Writes a match's summary row plus all of its logged events in one transaction.
export function flushMatch(db: Database.Database, summary: MatchSummary, events: Event[]): void {
    const insertMatchStmt = db.prepare(`
        INSERT INTO matches (id, room_code, start_time, end_time, north_score, south_score, created_at)
        VALUES (@matchId, @roomCode, @startTime, @endTime, @northScore, @southScore, @createdAt)
    `);
    const insertEventStmt = db.prepare(`
        INSERT INTO events (match_id, player_id, type, time, payload)
        VALUES (@matchId, @playerId, @type, @time, @payload)
    `);

    const run = db.transaction(() => {
        insertMatchStmt.run({ ...summary, createdAt: Date.now() });
        for (const event of events) {
            insertEventStmt.run({
                matchId: summary.matchId,
                playerId: event.id,
                type: event.type,
                time: event.time,
                payload: JSON.stringify(event.payload),
            });
        }
    });
    run();
}
