import * as assert from 'assert';
import { CTFMatchRoom } from '../CTFMatchRoom';
import { PlayerManager } from '../modules/PlayerManager';
import { FakeSocket } from './helpers/testRoom';
import { handleUseTicket, handleUseInvisPot, handleUseDoublePowerup, handleUpdateCoins } from '../handlers/itemHandlers';
import { ticketPrice, invisibilityPotionPrice, doublePowerUpPrice, startingCoins } from '../config/game_settings';

describe('item handlers', function() {

    it('handleUseTicket', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Alpha_id';
        const player = new PlayerManager('Alpha', 'North', id, room.getContext.bind(room));
        room.playerManagers.set(id, player);
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        // Insufficient funds
        await handleUseTicket(room, id, { num: 1000 });
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 403);
        assert.strictEqual(player.coins, startingCoins);

        // Success
        await handleUseTicket(room, id, { num: 1 });
        assert.deepEqual(socket.sent[socket.sent.length - 1], { type: 'useTicketResult', payload: { success: true } });
        assert.strictEqual(player.coins, startingCoins - ticketPrice);
    });

    it('handleUseInvisPot', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Beta_id';
        const player = new PlayerManager('Beta', 'South', id, room.getContext.bind(room));
        player.coins = invisibilityPotionPrice - 1;
        room.playerManagers.set(id, player);
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        // Insufficient funds
        await handleUseInvisPot(room, id);
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 403);

        // Success
        player.coins = invisibilityPotionPrice;
        await handleUseInvisPot(room, id);
        const result = socket.sent[socket.sent.length - 1];
        assert.strictEqual(result.type, 'useInvisPotResult');
        assert.ok(result.payload.invisibilityEnd !== undefined);
        assert.strictEqual(player.coins, 0);
        assert.ok(player.invisibilityEnd !== undefined && player.invisibilityEnd > Date.now());
    });

    it('handleUseDoublePowerup', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Gamma_id';
        const player = new PlayerManager('Gamma', 'North', id, room.getContext.bind(room));
        player.coins = doublePowerUpPrice - 1;
        room.playerManagers.set(id, player);
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        // Insufficient funds
        await handleUseDoublePowerup(room, id);
        assert.strictEqual(socket.sent[socket.sent.length - 1].payload.errorCode, 403);

        // Success
        player.coins = doublePowerUpPrice;
        await handleUseDoublePowerup(room, id);
        const result = socket.sent[socket.sent.length - 1];
        assert.strictEqual(result.type, 'useDoublePowerupResult');
        assert.strictEqual(player.doubleNextChallenge, true);
        assert.strictEqual(player.coins, 0);
    });

    it('handleUpdateCoins', async function() {
        const room = new CTFMatchRoom('TEST');
        room.gameState = 'inGame';
        const id = 'Delta_id';
        const player = new PlayerManager('Delta', 'South', id, room.getContext.bind(room));
        room.playerManagers.set(id, player);
        const socket = new FakeSocket();
        room.registerClient(id, socket as any);

        await handleUpdateCoins(room, id);
        assert.deepEqual(socket.sent[0], { type: 'updateCoinsResult', payload: { coins: startingCoins } });
    });
});
