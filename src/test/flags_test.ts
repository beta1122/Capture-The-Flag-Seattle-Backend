import * as assert from "assert"
import * as httpMocks from "node-mocks-http"
import { gameController } from "../modules/GameController"
import { PlayerManager } from "../modules/PlayerManager"
import { captureFlag, takeFlag } from "../routes/flag_routes"

describe('flag_routes', function(){
    it("takeFlag", async function(){
        gameController.resetGame();
        gameController.gameState = "inGame";
        gameController.setFlags();
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);

        BetaPlayerManager.flagHeld = "Flag!!!";
        // Try picking up a south flag when already have a flag

        const req1 = httpMocks.createRequest({method: "POST", url: "/api/takeFlag", body: {id: "Beta_id", flag: "Gas Works Park"}})
        const res1 = httpMocks.createResponse();

        await takeFlag(req1, res1);
        assert.strictEqual(res1._getData(), "You are already holding a flag. leave some for the rest of us");

        // try picking up a bogus flag

        BetaPlayerManager.flagHeld = undefined;
        const req2 = httpMocks.createRequest({method: "POST", url: "/api/takeFlag", body: {id: "Beta_id", flag: "MEWLKKDEWFJE"}})
        const res2 = httpMocks.createResponse();
        await takeFlag(req2, res2);
        assert.strictEqual(res2._getData(), "Couldn't find flag");

        // try picking up a team flag

        BetaPlayerManager.flagHeld = undefined;
        const req3 = httpMocks.createRequest({method: "POST", url: "/api/takeFlag", body: {id: "Beta_id", flag: "Mariners Stadium, SW Entrance"}})
        const res3 = httpMocks.createResponse();
        await takeFlag(req3, res3);
        assert.strictEqual(res3._getData(), "Couldn't find flag");

        // Try being tagged
        BetaPlayerManager.isTagged = true;
        const res4 = httpMocks.createResponse();
        await takeFlag(req1, res4);
        assert.strictEqual(res4._getData(), "You got tagged and can't pick up a flag until you return to your territory.");

        // Try not being close enough to the flag
        BetaPlayerManager.isTagged = false;
        const res5 = httpMocks.createResponse();
        await takeFlag(req1, res5);
        assert.strictEqual(res5._getData(), "You're not close enough to the flag yet!");

        // Try having the flag already being held by a player
        const flag = gameController.northFlags.get("Gas Works Park");
        assert.ok(flag != undefined);
        flag.playerHolding = " me";

        BetaPlayerManager.lat = flag.lat;
        BetaPlayerManager.lng = flag.lng;
        const res6 = httpMocks.createResponse();
        await takeFlag(req1, res6);
        assert.strictEqual(res6._getData(), "Flag already has a player holding.");
        
        //Flag is either captured or held by a player
        flag.playerHolding = undefined
        flag.flagState = "captured";
        const res7 = httpMocks.createResponse();
        await takeFlag(req1, res7);
        assert.strictEqual(res7._getData(), "Flag is either captured or held by a player");

        flag.flagState = "grounded";
        const res8 = httpMocks.createResponse();
        await takeFlag(req1, res8);
        assert.strictEqual(res8._getData(), "Success");
        assert.strictEqual(res8._getStatusCode(), 200);
        assert.strictEqual(flag.playerHolding, "Beta");
        assert.strictEqual(flag.flagState, "held");
        assert.strictEqual(BetaPlayerManager.flagHeld, "Gas Works Park");
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
    })

    it("captureFlag", async function(){
        gameController.resetGame();
        gameController.gameState = "inGame";
        gameController.setFlags();
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);

        const flag = gameController.northFlags.get("Gas Works Park");
        assert.ok(flag != undefined);
        flag.playerHolding = " me";

        // Try capturing a flag without having one
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/captureFlag", body: {id: "Beta_id"}})
        const res1 = httpMocks.createResponse();
        await captureFlag(req1, res1);
        assert.strictEqual(res1._getData(),"Youre not holding a flag. what are you trying to capture, the air?");

        // now claim to have the flag without flag approval
        BetaPlayerManager.flagHeld = "Gas Works Park"
        const res2 = httpMocks.createResponse();
        await captureFlag(req1, res2);
        assert.strictEqual(res2._getData(),"Player not registered to have this flag.");

        flag.playerHolding = "Beta";
        
        // Now try to capture flag but it isn't held ("Grounded")
        const res3 = httpMocks.createResponse();
        await captureFlag(req1, res3);
        assert.strictEqual(res3._getData(),"Flag is either grounded or captured");
        

        // Now try to capture flag but in enemy territory
        flag.flagState = "held";
        BetaPlayerManager.lat = 100;
        const res4 = httpMocks.createResponse();
        await captureFlag(req1, res4);
        assert.strictEqual(res4._getData(),"You need to be in your own territory to capture a flag!");

        assert.strictEqual(gameController.eventManager.gameEvents.length, 0);
        assert.strictEqual(gameController.scoreManager.southScore, 0);
        // now for real
        BetaPlayerManager.lat = 0;
        const res5 = httpMocks.createResponse();
        await captureFlag(req1, res5);
        assert.strictEqual(res5._getData(),"Success");
        assert.strictEqual(flag.playerHolding, undefined);
        assert.strictEqual(flag.flagState, "captured");
        assert.strictEqual(BetaPlayerManager.flagHeld, undefined);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        assert.strictEqual(gameController.scoreManager.southScore, flag.reward);
    })

})