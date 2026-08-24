import * as assert from 'assert';
import { createDb } from '../persistence/db';
import { flushMatch } from '../persistence/eventLogRepository';
import { EventManager } from '../modules/EventManager';

describe('event log persistence', function() {

    it('flushMatch writes a matches row and its events rows', function() {
        const db = createDb(':memory:');
        const eventManager = new EventManager();
        eventManager.gameEvents.push(
            { type: 'FLAG_PICKUP', id: 'Alpha_id', time: 1000, payload: { title: 'Some Flag' } },
            { type: 'TAGGED', id: 'Beta_id', time: 2000, payload: { taggerName: 'Alpha' } },
        );

        const events = eventManager.flush();
        assert.ok(events !== undefined);
        assert.strictEqual(events!.length, 2);

        flushMatch(db, {
            matchId: 'match-1',
            roomCode: 'TEST',
            startTime: 500,
            endTime: 5000,
            northScore: 10,
            southScore: 5,
        }, events!);

        const matchRow = db.prepare('SELECT * FROM matches WHERE id = ?').get('match-1') as any;
        assert.strictEqual(matchRow.room_code, 'TEST');
        assert.strictEqual(matchRow.start_time, 500);
        assert.strictEqual(matchRow.end_time, 5000);
        assert.strictEqual(matchRow.north_score, 10);
        assert.strictEqual(matchRow.south_score, 5);

        const eventRows = db.prepare('SELECT * FROM events WHERE match_id = ? ORDER BY time').all('match-1') as any[];
        assert.strictEqual(eventRows.length, 2);
        assert.strictEqual(eventRows[0].type, 'FLAG_PICKUP');
        assert.strictEqual(eventRows[0].player_id, 'Alpha_id');
        assert.deepEqual(JSON.parse(eventRows[0].payload), { title: 'Some Flag' });
        assert.strictEqual(eventRows[1].type, 'TAGGED');
        assert.strictEqual(eventRows[1].player_id, 'Beta_id');
    });

    it('EventManager.flush() only returns events once', function() {
        const eventManager = new EventManager();
        eventManager.gameEvents.push({ type: 'FLAG_CAPTURE', id: 'X', time: 1, payload: { title: 'F' } });

        const first = eventManager.flush();
        assert.strictEqual(first?.length, 1);

        const second = eventManager.flush();
        assert.strictEqual(second, undefined);
    });
});
