import * as assert from "assert"
import * as httpMocks from "node-mocks-http"
import { gameController } from "../modules/GameController"
import { PlayerManager } from "../modules/PlayerManager"
import { finishChallenge, startChallenge, vetoChallenge, viewChallenges } from "../routes/challenge_routes"
import { challengeDrawSize, startingCoins } from "../config/game_settings"
import { Challenge } from "../common/types"

describe('challenge_routes', function(){
    it("viewChallenges", async function(){
        gameController.resetGame();
        
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/ViewChallenges", body: {}});
        const res1 = httpMocks.createResponse();
        await viewChallenges(req1, res1);
        assert.strictEqual(res1._getStatusCode(), 200);
        assert.strictEqual(res1._getData().length,challengeDrawSize);

        gameController.challengeManager.ChallengeDeck = []
        const res2 = httpMocks.createResponse();
        await viewChallenges(req1, res1);
        assert.strictEqual(res2._getStatusCode(), 200);
        assert.strictEqual(res2._getData().length,0);
    })

    it('startChallenge', async function() {
        gameController.resetGame();
        gameController.gameState= "inGame"
        const BetaPlayerManager = new PlayerManager("Beta", "North", "Beta_id", gameController.getGameContext.bind(gameController));
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        const challenges:Challenge[] = [
            {title: "1",description: "1",coins: 1},
            {title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},
        ]
        gameController.challengeManager.ChallengeDeck = challenges;
        const req1 = httpMocks.createRequest({method: "POST", url: "/api/getChallenge", body: {id: "Beta_id", challengeTitle: "1"}});
        const res1 = httpMocks.createResponse();
        await startChallenge(req1, res1);
        assert.strictEqual(res1._getStatusCode(), 200);
        assert.deepEqual(res1._getData(),  {title: "1",description: "1",coins: 1});

        // Make sure the challenge deck has removed 1.
        assert.deepEqual(gameController.challengeManager.ChallengeDeck, [{title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},])
        // make sure the player now gets a challenge
        assert.deepEqual(BetaPlayerManager.currChallenge ,{title: "1",description: "1",coins: 1});
        // Make sure event was logged
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);

        //try all the other ways to break this

        // try grabbing a challenge when you already have a challenge
        const req2 = httpMocks.createRequest({method: "POST", url: "/api/getChallenge", body: {id: "Beta_id", challengeTitle: "2"}});
        const res2 = httpMocks.createResponse();
        await startChallenge(req2, res2);
        assert.strictEqual(res2._getData(), "You already have a challenge going!");

        // try having a veto period
        BetaPlayerManager.currChallenge = undefined;
        BetaPlayerManager.vetoPeriodEnd = Date.now() + 10000;
        const res3 = httpMocks.createResponse();
        await startChallenge(req2, res3);
        assert.strictEqual(res3._getData(), "Veto period not over yet");
        
        // try pulling a non existent challenge
        BetaPlayerManager.vetoPeriodEnd = undefined;
        const req4 = httpMocks.createRequest({method: "POST", url: "/api/getChallenge", body: {id: "Beta_id", challengeTitle: "1281703128"}});
        const res4 = httpMocks.createResponse();
        await startChallenge(req4, res4);
        assert.strictEqual(res4._getData(), "Challenge no longer in deck / not found");
        
        // Try pulling a challenge that isn't in the top k
        const req5 = httpMocks.createRequest({method: "POST", url: "/api/getChallenge", body: {id: "Beta_id", challengeTitle: "8"}});
        const res5 = httpMocks.createResponse();
        await startChallenge(req5, res5);
        assert.strictEqual(res5._getData(), "Challenge no longer in deck / not found");

        // Pull the 3rd challenge
        const req6 = httpMocks.createRequest({method: "POST", url: "/api/getChallenge", body: {id: "Beta_id", challengeTitle: "4"}});
        const res6 = httpMocks.createResponse();
        await startChallenge(req6, res6);
        assert.deepEqual(res6._getData(), {title: "4",description: "1",coins: 1});
        assert.deepEqual(gameController.challengeManager.ChallengeDeck, [{title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},])

        assert.strictEqual(gameController.eventManager.gameEvents.length, 2);
    })
    it('finishChallenge', async function(){
        // Set up
        gameController.resetGame();
        gameController.gameState= "inGame"
        const BetaPlayerManager = new PlayerManager("Beta", "North", "Beta_id", gameController.getGameContext.bind(gameController));
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        const challenges:Challenge[] = [
            {title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},
        ]
        gameController.challengeManager.ChallengeDeck = challenges;

        // Try finishing without a current challenge
        const req1 = httpMocks.createRequest({method: "POST", url: '/api/finishChallenge', body: {id: "Beta_id"}});
        const res1 = httpMocks.createResponse();

        await finishChallenge(req1, res1);
        assert.strictEqual(res1._getData(),"You don't have a challenge going!")

        // Ok now we actually
        BetaPlayerManager.currChallenge = {title: "1", description: "1", coins: 1}
        const res2 = httpMocks.createResponse();
        await finishChallenge(req1, res2);
        assert.strictEqual(res2._getData(),"Success")
        assert.strictEqual(BetaPlayerManager.currChallenge, undefined);
        assert.strictEqual(BetaPlayerManager.coins, startingCoins + 1);
        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);

        // Make sure it was put back into the deck 
        assert.deepEqual(gameController.challengeManager.ChallengeDeck, [
            {title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},
            {title: "1", description: "1", coins: 1}
        ]);
    })
    it('vetoChallenge', async function() {
        gameController.resetGame();
        gameController.gameState= "inGame"
        const BetaPlayerManager = new PlayerManager("Beta", "North", "Beta_id", gameController.getGameContext.bind(gameController));
        gameController.playerManagers.set("Beta_id", BetaPlayerManager);
        const challenges:Challenge[] = [
            {title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},
        ]
        gameController.challengeManager.ChallengeDeck = challenges;

        // Try vetoing without a challenge
        const req1 = httpMocks.createRequest({method: "POST", url: '/api/vetoChallenge', body: {id: "Beta_id"}});
        const res1 = httpMocks.createResponse();
        await vetoChallenge(req1, res1);
        assert.strictEqual(res1._getData(), "You don't have a challenge going!");

        // Ok now we actually
        BetaPlayerManager.currChallenge = {title: "1", description: "1", coins: 1}
        const res2 = httpMocks.createResponse();
        await vetoChallenge(req1, res2);
        //assert.strictEqual(res2._getData(), "Success");

        assert.strictEqual(gameController.eventManager.gameEvents.length, 1);
        assert.ok(BetaPlayerManager.vetoPeriodEnd != undefined);
        assert.ok(BetaPlayerManager.vetoPeriodEnd> Date.now());
        assert.ok(BetaPlayerManager.currChallenge == undefined);
        // Make sure it was put back into the deck 
        assert.deepEqual(gameController.challengeManager.ChallengeDeck, [
            {title: "2",description: "1",coins: 1},
            {title: "3",description: "1",coins: 1},
            {title: "4",description: "1",coins: 1},
            {title: "5",description: "1",coins: 1},
            {title: "6",description: "1",coins: 1},
            {title: "7",description: "1",coins: 1},
            {title: "8",description: "1",coins: 1},
            {title: "1", description: "1", coins: 1}
        ]);
    })
})