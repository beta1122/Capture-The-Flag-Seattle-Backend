import * as assert from 'assert';
import { CTFMatchRoom } from '../rooms/ctf/CTFMatchRoom';
import { FakeSocket } from './helpers/testRoom';
import { handleJoinTeam, handleStartGame } from '../rooms/ctf/handlers/teamHandlers';

describe('team handlers', function() {

    it('addPlayerToGame (join)', async function() {
        const room = new CTFMatchRoom('TEST');

        const bobId = await room.teamManager.addPlayerToGame('Bob');
        assert.strictEqual(typeof bobId, 'string');

        // Duplicate name rejected
        const dup = await room.teamManager.addPlayerToGame('Bob');
        assert.deepEqual(dup, { errorCode: 401, description: 'There already is a player with this name in the game.' });

        const betaId = await room.teamManager.addPlayerToGame('Beta');
        assert.strictEqual(typeof betaId, 'string');
    });

    it('joinTeam', async function() {
        const room = new CTFMatchRoom('TEST');
        const bobId = await room.teamManager.addPlayerToGame('Bob') as string;

        const socket = new FakeSocket();
        room.registerClient(bobId, socket as any);

        // handleJoinTeam sends a direct joinTeamResult reply, then broadcasts a
        // preGameUpdate to the whole room (Bob included) - so the result is always the
        // message appended right before the broadcast, not necessarily the last one sent.
        await handleJoinTeam(room, bobId, { team: 'North' });
        assert.deepEqual(room.teamManager.teamNorth, ['Bob']);
        assert.deepEqual(socket.sent[0], { type: 'joinTeamResult', payload: { success: true } });
        assert.strictEqual(socket.sent[1].type, 'preGameUpdate');

        await handleJoinTeam(room, bobId, { team: 'South' });
        assert.deepEqual(room.teamManager.teamNorth, []);
        assert.deepEqual(room.teamManager.teamSouth, ['Bob']);
        assert.deepEqual(socket.sent[2], { type: 'joinTeamResult', payload: { success: true } });

        await handleJoinTeam(room, bobId, { team: 'not-a-team' });
        const last = socket.sent[socket.sent.length - 1];
        assert.strictEqual(last.type, 'joinTeamResult');
        assert.strictEqual(last.payload.errorCode, 401);
    });

    it('joinTeam rejects an unknown playerId', async function() {
        const room = new CTFMatchRoom('TEST');
        const socket = new FakeSocket();
        room.registerClient('not-a-real-id', socket as any);

        await handleJoinTeam(room, 'not-a-real-id', { team: 'North' });
        const last = socket.sent[socket.sent.length - 1];
        assert.strictEqual(last.type, 'joinTeamResult');
        assert.strictEqual(last.payload.errorCode, 401);
        assert.deepEqual(room.teamManager.teamNorth, []);
    });

    it('removePlayerFromGame (leave)', async function() {
        const room = new CTFMatchRoom('TEST');
        const betaId = await room.teamManager.addPlayerToGame('Beta') as string;
        const bobId = await room.teamManager.addPlayerToGame('Bob') as string;
        room.teamManager.teamNorth.push('Beta');

        await room.teamManager.removePlayerFromGame(bobId);
        assert.deepEqual(room.teamManager.teamNorth, ['Beta']);

        await room.teamManager.removePlayerFromGame(betaId);
        assert.deepEqual(room.teamManager.teamNorth, []);
    });

    it('getPreGameInfo default shape', function() {
        const room = new CTFMatchRoom('TEST');
        assert.deepEqual(room.teamManager.getPreGameInfo(), {
            gameState: 'preGame',
            playersWithoutTeams: [],
            teamNorth: [],
            teamSouth: [],
        });
    });

    it('startGame rejects a non-host player', async function() {
        const room = new CTFMatchRoom('TEST');
        const bobId = await room.teamManager.addPlayerToGame('Bob') as string;
        const betaId = await room.teamManager.addPlayerToGame('Beta') as string;
        room.hostPlayerId = bobId;

        const socket = new FakeSocket();
        room.registerClient(betaId, socket as any);

        await handleStartGame(room, betaId);
        assert.strictEqual(room.gameState, 'preGame');
        assert.deepEqual(socket.sent[0], {
            type: 'startGameResult',
            payload: { errorCode: 403, description: 'Only the match host can start the game' },
        });

        room.dispose();
    });

    it('startGame succeeds for the host and populates player managers', async function() {
        const room = new CTFMatchRoom('TEST');
        const bobId = await room.teamManager.addPlayerToGame('Bob') as string;
        room.hostPlayerId = bobId;
        room.teamManager.teamNorth.push('Bob');

        const socket = new FakeSocket();
        room.registerClient(bobId, socket as any);

        await handleStartGame(room, bobId);
        assert.strictEqual(room.gameState, 'inGame');
        assert.ok(room.playerManagers.has(bobId));
        assert.deepEqual(socket.sent[0], { type: 'startGameResult', payload: { success: true } });
        assert.strictEqual(socket.sent[1].type, 'gameUpdate');

        room.dispose();
    });
});
