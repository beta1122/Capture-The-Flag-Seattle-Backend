import * as assert from 'assert';
import { CTFMatchRoom } from '../CTFMatchRoom';
import { PlayerManager } from '../modules/PlayerManager';
import { FakeSocket } from './helpers/testRoom';
import { handleLocation } from '../handlers/locationHandlers';

describe('location handler', function() {

    it('handleLocation', async function() {
        const room = new CTFMatchRoom('TEST');
        room.setFlags();
        room.gameState = 'inGame';

        // Basic update
        const alphaId = 'Alpha_id';
        const alpha = new PlayerManager('Alpha', 'North', alphaId, room.getContext.bind(room));
        alpha.isTagged = true;
        room.playerManagers.set(alphaId, alpha);
        const alphaSocket = new FakeSocket();
        room.registerClient(alphaId, alphaSocket as any);

        await handleLocation(room, alphaId, { lat: 37.7749, lng: -122.4194 });
        assert.deepEqual(alphaSocket.sent[0], { type: 'locationResult', payload: { success: true } });
        assert.ok(room.eventManager.gameEvents.length === 1);
        assert.strictEqual(room.playerManagers.get(alphaId)?.isTagged, true);

        // Second player update untags on move into own territory
        const betaId = 'Beta_id';
        const beta = new PlayerManager('Beta', 'South', betaId, room.getContext.bind(room));
        beta.isTagged = true;
        room.playerManagers.set(betaId, beta);
        const betaSocket = new FakeSocket();
        room.registerClient(betaId, betaSocket as any);

        await handleLocation(room, betaId, { lat: 37.7749, lng: -122.4194 });
        assert.deepEqual(betaSocket.sent[0], { type: 'locationResult', payload: { success: true } });
        assert.strictEqual(room.eventManager.gameEvents.length, 2);
        assert.strictEqual(room.playerManagers.get(betaId)?.lat, 37.7749);
        assert.ok(!room.playerManagers.get(betaId)?.isTagged);

        // Player claims to hold a flag the flag object doesn't agree they hold
        const deltaId = 'Delta_id';
        const delta = new PlayerManager('Delta', 'South', deltaId, room.getContext.bind(room));
        room.playerManagers.set(deltaId, delta);
        delta.flagHeld = 'Gas Works Park';
        const deltaSocket = new FakeSocket();
        room.registerClient(deltaId, deltaSocket as any);

        await handleLocation(room, deltaId, { lat: 37.7749, lng: -122.4194 });
        const deltaResult1 = deltaSocket.sent[deltaSocket.sent.length - 1];
        assert.strictEqual(deltaResult1.payload.description, 'Player not registered to have this flag.');
        // Fields still get updated even though the flag claim was rejected
        assert.strictEqual(room.eventManager.gameEvents.length, 3);
        assert.strictEqual(delta.lat, 37.7749);
        assert.strictEqual(room.northFlags.get('Gas Works Park')?.lat, 47.6456);

        // Now actually register Delta as holding the flag from the flag's point of view
        const flag = room.northFlags.get('Gas Works Park');
        if (flag !== undefined) {
            flag.playerHolding = 'Delta';
            flag.flagState = 'held';
        }
        await handleLocation(room, deltaId, { lat: 37.7749, lng: -122.4194 });
        const deltaResult2 = deltaSocket.sent[deltaSocket.sent.length - 1];
        assert.deepEqual(deltaResult2, { type: 'locationResult', payload: { success: true } });
        assert.strictEqual(room.eventManager.gameEvents.length, 4);
        assert.strictEqual(flag?.lat, 37.7749);

        // Invisibility: visible_lat/lng frozen while real lat/lng keeps updating
        const gammaId = 'Gamma_id';
        const gamma = new PlayerManager('Gamma', 'South', gammaId, room.getContext.bind(room));
        room.playerManagers.set(gammaId, gamma);
        gamma.lat = 100;
        gamma.lng = 100;
        gamma.visible_lat = 100;
        gamma.visible_lng = 100;
        gamma.invisibilityEnd = Date.now() + 10000;
        const gammaSocket = new FakeSocket();
        room.registerClient(gammaId, gammaSocket as any);

        await handleLocation(room, gammaId, { lat: 37.7749, lng: -122.4194 });
        assert.deepEqual(gammaSocket.sent[0], { type: 'locationResult', payload: { success: true } });
        assert.strictEqual(gamma.visible_lat, 100);
        assert.strictEqual(gamma.visible_lng, 100);
        assert.strictEqual(gamma.lat, 37.7749);
        assert.strictEqual(gamma.lng, -122.4194);
    });

    it('rejects non-numeric lat/lng', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Zeta_id';
        room.playerManagers.set(id, new PlayerManager('Zeta', 'North', id, room.getContext.bind(room)));
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        await handleLocation(room, id, { lat: 'not-a-number', lng: -122.4194 });
        assert.strictEqual(socket.sent[0].type, 'locationResult');
        assert.strictEqual(socket.sent[0].payload.errorCode, 401);
    });

    it('rejects a player not in the match', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const socket = new FakeSocket();
        room.registerClient('unknown_id', socket as any);

        await handleLocation(room, 'unknown_id', { lat: 1, lng: 1 });
        assert.deepEqual(socket.sent[0], {
            type: 'locationResult',
            payload: { errorCode: 400, description: 'Player not found in this match' },
        });
    });
});
