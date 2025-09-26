import * as assert from 'assert';
import * as httpMocks from 'node-mocks-http';

import { gameController } from '../modules/GameController';
import { PlayerManager } from '../modules/PlayerManager';
import { useDoublePowerup, useInvisPot, useTicket } from '../routes/item_routes';
import { doublePowerUpPrice, invisibilityPotionPrice, ticketPrice } from '../config/game_settings';

describe('item_routes', function() {

    it('useTicket', async function() {
         gameController.resetGame();

        //Set up
        gameController.setFlags();
        gameController.gameState = "inGame";
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/useTicket", body: {id: "Beta_id", num: 1}})
        const res1 = httpMocks.createResponse();
        BetaPlayerManager.coins = 100;
        await useTicket(req1, res1);
        assert.strictEqual(res1._getData(), "Success");
        assert.strictEqual(BetaPlayerManager.coins, 100- ticketPrice);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        const req2 = httpMocks.createRequest({method: "POST", url: "/api/useTicket", body: {id: "Beta_id", num: 100}})
        const res2 = httpMocks.createResponse();
        await useTicket(req2, res2);
        assert.strictEqual(res2._getStatusCode(), 403);
        assert.strictEqual(BetaPlayerManager.coins, 100- ticketPrice);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
    })
    it('useInvisibilityPotion', async function() {
         gameController.resetGame();

        //Set up
        gameController.setFlags();
        gameController.gameState = "inGame";
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/useInvisibilityPotion", body: {id: "Beta_id"}})
        const res1 = httpMocks.createResponse();
        BetaPlayerManager.coins = 100;
        await useInvisPot(req1, res1);
        assert.strictEqual(res1._getData(), "Success");
        assert.strictEqual(BetaPlayerManager.coins, 100- invisibilityPotionPrice);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        assert.ok(BetaPlayerManager.invisibilityEnd != undefined);
        BetaPlayerManager.coins = 0;
        const req2 = httpMocks.createRequest({method: "POST", url: "/api/useInvisibilityPotion", body: {id: "Beta_id"}})
        const res2 = httpMocks.createResponse();
        await useInvisPot(req2, res2);
        assert.strictEqual(res2._getStatusCode(), 403);
        assert.strictEqual(BetaPlayerManager.coins,0);
    })

    it('useDoublePowerup', async function() {
         gameController.resetGame();

        //Set up
        gameController.setFlags();
        gameController.gameState = "inGame";
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/useDoublePowerup", body: {id: "Beta_id"}})
        const res1 = httpMocks.createResponse();
        BetaPlayerManager.coins = 100;
        await useDoublePowerup(req1, res1);
        assert.strictEqual(res1._getData(), "Success");
        assert.strictEqual(BetaPlayerManager.coins, 100- doublePowerUpPrice);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        assert.ok(BetaPlayerManager.invisibilityEnd == undefined);
        assert.ok(BetaPlayerManager.doubleNextChallenge == true);
        BetaPlayerManager.coins = 0;
        const req2 = httpMocks.createRequest({method: "POST", url: "/api/useDoublePowerup", body: {id: "Beta_id"}})
        const res2 = httpMocks.createResponse();
        await useDoublePowerup(req2, res2);
        assert.strictEqual(res2._getStatusCode(), 403);
        assert.strictEqual(BetaPlayerManager.coins,0);
    })

})