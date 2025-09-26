import * as assert from "assert"
import * as httpMocks from "node-mocks-http"
import { gameController } from "../modules/GameController";
import { PlayerManager } from "../modules/PlayerManager";
import { handleTag } from "../routes/tag_routes";
import { startingCoins } from "../config/game_settings";

describe('tag_routes', function(){
    it("handleTag", async function(){
        gameController.resetGame();
        gameController.gameState = "inGame";
        gameController.setFlags();
        gameController.teamManager.playerToID["Beta"] = "Beta_id"
        const BetaPlayerManager = new PlayerManager("Beta", "South", "Beta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);

        // try getting tagged when already tagged :(
        BetaPlayerManager.isTagged = true;
        const req1 = httpMocks.createRequest({method: "POST",  url: "/api/handleTag", body: {id: "Beta_id", name: ""}})
        const res1 = httpMocks.createResponse();
        await handleTag(req1, res1);
        assert.strictEqual(res1._getData(), "You already got tagged! You shouldn't be able to get tagged again until you return.");

        BetaPlayerManager.isTagged = false;
        // Try getting tagged in own territory

        const res2 = httpMocks.createResponse();
        await handleTag(req1, res2);
        assert.strictEqual(res2._getData(), "You can't get tagged in your own territory!");

        // get tagged by the air
        BetaPlayerManager.lat = 100;
        const res3 = httpMocks.createResponse();
        await handleTag(req1, res3);
        assert.strictEqual(res3._getData(), "coudln't find player with that name. please try again.");

        // Register another player, but on our team
        const AlphaPlayerManager = new PlayerManager("Alpha", "South", "Alpha_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Alpha_id", AlphaPlayerManager);
        const req2 = httpMocks.createRequest({method: "POST",  url: "/api/handleTag", body: {id: "Beta_id", name: "Alpha"}})
        const res4 = httpMocks.createResponse();
        gameController.teamManager.playerToID["Alpha"] = "Alpha_id";
        await handleTag(req2, res4);
        assert.strictEqual(res4._getData(), "You can't get tagged by a player on your own team");

        // Okay fine we'll try to get tagged by a player on the opposite team
        AlphaPlayerManager.team = "North";
        const res5 = httpMocks.createResponse();
        await handleTag(req2, res5);
        assert.strictEqual(res5._getData(), "Success");

        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        assert.strictEqual(BetaPlayerManager.coins, 0);
        assert.strictEqual(AlphaPlayerManager.coins, startingCoins + startingCoins);
        assert.strictEqual(BetaPlayerManager.isTagged, true);
        assert.ok(BetaPlayerManager.vetoPeriodEnd !== undefined);
        assert.ok(BetaPlayerManager.vetoPeriodEnd > Date.now());

        // Try tagging another player now, this time with a flag
        const DeltaPlayerManager = new PlayerManager("Delta", "North", "Delta_id", gameController.getGameContext.bind(gameController))
        gameController.playerManagers.set("Delta_id", DeltaPlayerManager);
        DeltaPlayerManager.flagHeld = "Mariners Stadium, SW Entrance";
        const flag = gameController.southFlags.get("Mariners Stadium, SW Entrance");
        assert.ok(flag!= undefined);
        flag.playerHolding="Delta";
        flag.flagState = "held";
        const req3 = httpMocks.createRequest({method: "POST",  url: "/api/handleTag", body: {id: "Delta_id", name: "Beta"}})
        const res6 = httpMocks.createResponse();

        await handleTag(req3, res6);
        assert.strictEqual(res6._getData(), "Success");
        assert.strictEqual(gameController.eventManager.gameEvents.length, 2);
        assert.strictEqual(DeltaPlayerManager.coins, 0);
        assert.strictEqual(BetaPlayerManager.coins, startingCoins);
        assert.strictEqual(DeltaPlayerManager.isTagged, true);
        assert.ok(DeltaPlayerManager.vetoPeriodEnd !== undefined);
        assert.ok(DeltaPlayerManager.vetoPeriodEnd > Date.now());
        // Confirm flag 
        assert.strictEqual(flag.flagState, "grounded");
        assert.strictEqual(flag.playerHolding, undefined);
        assert.strictEqual(DeltaPlayerManager.flagHeld, undefined);
    
    })
})