import * as assert from 'assert';
import { CTFMatchRoom } from '../rooms/ctf/CTFMatchRoom';
import { PlayerManager } from '../modules/PlayerManager';
import { FakeSocket } from './helpers/testRoom';
import { handleTag } from '../rooms/ctf/handlers/tagHandlers';

describe('tag handler', function() {

    it('handleTag', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        room.setFlags();

        // Alpha (North) defaults to lat 0, which is south of the boundary (47.6062) -
        // i.e. out in South's (enemy) territory, so Alpha is taggable.
        const alphaId = 'Alpha_id';
        const alpha = new PlayerManager('Alpha', 'North', alphaId, room.getContext.bind(room));
        room.playerManagers.set(alphaId, alpha);
        room.teamManager.playerToID['Alpha'] = alphaId;
        const alphaSocket = new FakeSocket();
        room.registerClient(alphaId, alphaSocket as any);

        const betaId = 'Beta_id';
        const beta = new PlayerManager('Beta', 'South', betaId, room.getContext.bind(room));
        room.playerManagers.set(betaId, beta);
        room.teamManager.playerToID['Beta'] = betaId;

        const gammaId = 'Gamma_id';
        const gamma = new PlayerManager('Gamma', 'North', gammaId, room.getContext.bind(room));
        room.playerManagers.set(gammaId, gamma);
        room.teamManager.playerToID['Gamma'] = gammaId;

        // Unknown tagger name
        await handleTag(room, alphaId, { taggerName: 'NoOneWithThisName' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 407);

        // Same-team tagger rejected
        await handleTag(room, alphaId, { taggerName: 'Gamma' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 408);

        // Can't be tagged in your own territory
        alpha.lat = 100; // north of the boundary -> Alpha's own (North) territory
        await handleTag(room, alphaId, { taggerName: 'Beta' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 408);
        alpha.lat = 0; // back into enemy territory

        // Success - Alpha is also carrying a flag, which should drop on tag
        const flag = room.southFlags.get('The Magic Shop in Pike Place')!;
        flag.playerHolding = 'Alpha';
        flag.flagState = 'held';
        alpha.flagHeld = 'The Magic Shop in Pike Place';

        const alphaCoinsBeforeTag = alpha.coins;
        const betaCoinsBefore = beta.coins;
        await handleTag(room, alphaId, { taggerName: 'Beta' });
        const result = alphaSocket.sent[alphaSocket.sent.length - 1];
        assert.strictEqual(result.type, 'tagResult');
        assert.ok(result.payload.vetoPeriodEnd !== undefined);
        assert.strictEqual(alpha.isTagged, true);
        assert.strictEqual(alpha.coins, 0);
        assert.strictEqual(alpha.flagHeld, undefined);
        assert.strictEqual(flag.flagState, 'grounded');
        assert.strictEqual(flag.playerHolding, undefined);
        // The tagged player's coins transfer to the tagger
        assert.strictEqual(beta.coins, betaCoinsBefore + alphaCoinsBeforeTag);

        // Already-tagged rejection
        await handleTag(room, alphaId, { taggerName: 'Beta' });
        assert.strictEqual(alphaSocket.sent[alphaSocket.sent.length - 1].payload.errorCode, 406);
    });
});
