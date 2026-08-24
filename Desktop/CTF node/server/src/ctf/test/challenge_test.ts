import * as assert from 'assert';
import { CTFMatchRoom } from '../CTFMatchRoom';
import { PlayerManager } from '../modules/PlayerManager';
import { FakeSocket } from './helpers/testRoom';
import { handleViewChallenges, handleStartChallenge, handleFinishChallenge, handleVetoChallenge } from '../handlers/challengeHandlers';
import { challengeDrawSize } from '../config/game_settings';

describe('challenge handlers', function() {

    it('handleViewChallenges', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Alpha_id';
        room.playerManagers.set(id, new PlayerManager('Alpha', 'North', id, room.getContext.bind(room)));
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        await handleViewChallenges(room, id);
        const result = socket.sent[0];
        assert.strictEqual(result.type, 'viewChallengesResult');
        assert.strictEqual(result.payload.length, challengeDrawSize);
    });

    it('start / finish / veto a challenge', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Alpha_id';
        const player = new PlayerManager('Alpha', 'North', id, room.getContext.bind(room));
        room.playerManagers.set(id, player);
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        // Not-found / not in the drawable top of the deck
        await handleStartChallenge(room, id, { challengeTitle: 'Not a real challenge' });
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 406);

        // Success
        const deckSizeBefore = room.challengeManager.ChallengeDeck.length;
        const target = (await room.challengeManager.viewTop())[0];
        await handleStartChallenge(room, id, { challengeTitle: target.title });
        assert.deepEqual(socket.sent[socket.sent.length - 1], { type: 'startChallengeResult', payload: target });
        assert.deepEqual(player.currChallenge, target);
        assert.strictEqual(room.challengeManager.ChallengeDeck.length, deckSizeBefore - 1);

        // Already has a challenge going
        await handleStartChallenge(room, id, { challengeTitle: target.title });
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 402);

        // finishChallenge: success, pays out and returns the card to the deck
        const coinsBefore = player.coins;
        await handleFinishChallenge(room, id);
        assert.deepEqual(socket.sent[socket.sent.length - 1], { type: 'finishChallengeResult', payload: { success: true } });
        assert.strictEqual(player.currChallenge, undefined);
        assert.strictEqual(player.coins, coinsBefore + target.coins);
        assert.strictEqual(room.challengeManager.ChallengeDeck.length, deckSizeBefore);

        // finishChallenge: no challenge going
        await handleFinishChallenge(room, id);
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 402);

        // vetoChallenge: no challenge going
        await handleVetoChallenge(room, id);
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 402);

        // Start another, then veto it
        const target2 = (await room.challengeManager.viewTop())[0];
        await handleStartChallenge(room, id, { challengeTitle: target2.title });
        await handleVetoChallenge(room, id);
        const vetoResult = socket.sent[socket.sent.length - 1];
        assert.strictEqual(vetoResult.type, 'vetoChallengeResult');
        assert.ok(vetoResult.payload.vetoPeriodEnd !== undefined);
        assert.strictEqual(player.currChallenge, undefined);
        assert.ok(player.vetoPeriodEnd !== undefined && player.vetoPeriodEnd > Date.now());
    });
});
