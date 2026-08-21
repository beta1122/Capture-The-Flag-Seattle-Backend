import * as assert from 'assert';
import { CTFMatchRoom } from '../rooms/ctf/CTFMatchRoom';
import { PlayerManager } from '../modules/PlayerManager';
import { FakeSocket } from './helpers/testRoom';
import { handleTakeFlag, handleCaptureFlag } from '../rooms/ctf/handlers/flagHandlers';

describe('flag handlers', function() {

    it('handleTakeFlag', async function() {
        const room = new CTFMatchRoom('TEST');
        room.setFlags();
        room.gameState = 'inGame';

        const alphaId = 'Alpha_id';
        const alpha = new PlayerManager('Alpha', 'North', alphaId, room.getContext.bind(room));
        room.playerManagers.set(alphaId, alpha);
        const alphaSocket = new FakeSocket();
        room.registerClient(alphaId, alphaSocket as any);

        // Already holding a flag
        alpha.flagHeld = 'Something';
        await handleTakeFlag(room, alphaId, { flag: 'The Magic Shop in Pike Place' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 402);
        alpha.flagHeld = undefined;

        // Bogus flag name
        await handleTakeFlag(room, alphaId, { flag: 'Not a real flag' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 400);

        // Wrong-team flag: a North player can only take South's flags
        await handleTakeFlag(room, alphaId, { flag: 'Gas Works Park' }); // a North flag
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 400);

        // Tagged players can't pick up flags
        alpha.isTagged = true;
        await handleTakeFlag(room, alphaId, { flag: 'The Magic Shop in Pike Place' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 406);
        alpha.isTagged = false;

        const flag = room.southFlags.get('The Magic Shop in Pike Place');
        assert.ok(flag !== undefined);

        // Flag already held by someone else
        flag!.playerHolding = 'SomeoneElse';
        flag!.flagState = 'held';
        await handleTakeFlag(room, alphaId, { flag: 'The Magic Shop in Pike Place' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 403);

        // Flag already captured
        flag!.playerHolding = undefined;
        flag!.flagState = 'captured';
        await handleTakeFlag(room, alphaId, { flag: 'The Magic Shop in Pike Place' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 406);

        // Success
        flag!.flagState = 'grounded';
        const eventsBefore = room.eventManager.gameEvents.length;
        await handleTakeFlag(room, alphaId, { flag: 'The Magic Shop in Pike Place' });
        assert.deepEqual(alphaSocket.sent[alphaSocket.sent.length - 1], { type: 'takeFlagResult', payload: { success: true } });
        assert.strictEqual(flag!.flagState, 'held');
        assert.strictEqual(flag!.playerHolding, 'Alpha');
        assert.strictEqual(alpha.flagHeld, 'The Magic Shop in Pike Place');
        assert.strictEqual(room.eventManager.gameEvents.length, eventsBefore + 1);

        // Note: game_settings.ts's DISABLE_FLAG_LOCATION_CHECK dev flag is true, so the
        // pickup-radius check (src/common/geo.ts's distanceMeters, now fixed to be a real
        // check) is always bypassed here - "too far away" isn't exercisable through this
        // module-level const without a dedicated build flag, so it isn't tested here.
    });

    it('handleCaptureFlag', async function() {
        const room = new CTFMatchRoom('TEST');
        room.setFlags();
        room.gameState = 'inGame';

        const alphaId = 'Alpha_id';
        const alpha = new PlayerManager('Alpha', 'North', alphaId, room.getContext.bind(room));
        room.playerManagers.set(alphaId, alpha);
        const alphaSocket = new FakeSocket();
        room.registerClient(alphaId, alphaSocket as any);

        // Not holding a flag
        await handleCaptureFlag(room, alphaId);
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 402);

        // Holding a flag title, but the flag object disagrees about who's holding it
        alpha.flagHeld = 'The Magic Shop in Pike Place';
        const flag = room.southFlags.get('The Magic Shop in Pike Place');
        assert.ok(flag !== undefined);
        flag!.playerHolding = 'SomeoneElse';
        flag!.flagState = 'held';
        await handleCaptureFlag(room, alphaId);
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 403);

        // Flag not in "held" state
        flag!.playerHolding = 'Alpha';
        flag!.flagState = 'grounded';
        await handleCaptureFlag(room, alphaId);
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 500);

        // Success
        flag!.flagState = 'held';
        const scoreBefore = room.scoreManager.northScore;
        const eventsBefore = room.eventManager.gameEvents.length;
        await handleCaptureFlag(room, alphaId);
        assert.deepEqual(alphaSocket.sent[alphaSocket.sent.length - 1], { type: 'captureFlagResult', payload: { success: true } });
        assert.strictEqual(flag!.flagState, 'captured');
        assert.strictEqual(alpha.flagHeld, undefined);
        // Capturing an enemy (South) flag awards score to the capturer's own team (North)
        assert.strictEqual(room.scoreManager.northScore, scoreBefore + flag!.reward);
        assert.strictEqual(room.eventManager.gameEvents.length, eventsBefore + 1);
    });
});
