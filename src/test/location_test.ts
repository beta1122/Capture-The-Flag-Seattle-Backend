import * as assert from 'assert';
import * as httpMocks from 'node-mocks-http';

import { gameController } from '../modules/GameController';
import { PlayerManager } from '../modules/PlayerManager';
import { sendLocationUpdate } from '../routes/location_routes';

describe('location_routes', function() {

    it('sendLocationUpdate', async function() {
        gameController.resetGame();

        //Set up
        gameController.setFlags();
        gameController.gameState = "inGame";

        const request_body = {
            "id": "Alpha_id",
            "lat": 37.7749,
            "lng": -122.4194,
        }
         // Prepare a player
         const id = "Alpha_id";
        const playerManager = new PlayerManager("Alpha", "North",  id, gameController.getGameContext.bind(gameController));
        playerManager.isTagged = true;
        gameController.playerManagers.set(id,playerManager);
        // Send request normally
        const req1 = httpMocks.createRequest({method: 'POST', url: '/api/sendLocationUpdate', body: request_body});
        const res1 = httpMocks.createResponse();
        await sendLocationUpdate(req1, res1);
        assert.strictEqual(res1._getData(),'Success');
        assert.strictEqual(res1._getStatusCode(), 200);
        // Make sure fields are modified
        assert.ok(gameController.eventManager.gameEvents.length==1);
        assert.strictEqual(gameController.playerManagers.get("Alpha_id")?.isTagged, true);
        
        
        // // Prepare another player
        const request_body2 = {
            "id": "Beta_id",
            "lat": 37.7749,
            "lng": -122.4194,
        }
        const playerManager2 = new PlayerManager("Beta", "South",  "Beta_id", gameController.getGameContext.bind(gameController));
        playerManager2.isTagged = true;
        gameController.playerManagers.set("Beta_id",playerManager2);
        const req2 = httpMocks.createRequest({method: 'POST', url: '/api/sendLocationUpdate', body: request_body2});
        const res2 = httpMocks.createResponse();
        
        await sendLocationUpdate(req2, res2);

        assert.strictEqual(res2._getData(),'Success');
        assert.strictEqual(res2._getStatusCode(), 200);
        assert.strictEqual(gameController.eventManager.gameEvents.length,2);
        assert.strictEqual(gameController.playerManagers.get("Beta_id")?.lat, 37.7749);
        // Should remove tagged status
         assert.ok(!gameController.playerManagers.get("Beta_id")?.isTagged);
        
        // // // Try adding a player with a flag, but without server approval
        const playerManager3 = new PlayerManager("Delta", "South",  "Delta_id", gameController.getGameContext.bind(gameController));
        gameController.playerManagers.set("Delta_id",playerManager3);
        playerManager3.flagHeld = "Gas Works Park"
        const request_body3 = {
            "id": "Delta_id",
            "lat": 37.7749,
            "lng": -122.4194,
        }
        const req3 = httpMocks.createRequest({method: 'POST', url: '/api/sendPlayerUpdate', body: request_body3});
        const res3 = httpMocks.createResponse();
        await sendLocationUpdate(req3, res3);
        assert.strictEqual(res3._getData(), "Player not registered to have this flag.");
        assert.strictEqual(res3._getStatusCode(), 403);
        // Make sure fields are still modified even though flag wasn't gotten
        assert.strictEqual(gameController.eventManager.gameEvents.length,3);
        // Make sure delta mvoed
        assert.strictEqual(playerManager3.lat, 37.7749);
        // Make sure flag didnt move
        assert.strictEqual(gameController.northFlags.get("Gas Works Park")?.lat, 47.6456);


        // // // Try again but this time actually have the flag from the game pov.
        const flag = gameController.northFlags.get("Gas Works Park");
        if(flag !== undefined){
           flag.playerHolding = "Delta";
           flag.flagState = "held";
        }

        const res4 = httpMocks.createResponse();
        await sendLocationUpdate(req3, res4);
        assert.strictEqual(res4._getData(),'Success');
        assert.strictEqual(res4._getStatusCode(), 200);
        assert.strictEqual(gameController.eventManager.gameEvents.length,4);
        // Make sure flag moved
        assert.strictEqual(flag?.lat, 37.7749);


        // Do invisibility now
        const playerManager4 = new PlayerManager("Gamma", "South",  "Gamma_id", gameController.getGameContext.bind(gameController));
        gameController.playerManagers.set("Gamma_id",playerManager4);
        playerManager4.lat = 100;
        playerManager4.lng = 100;
        playerManager4.visible_lat = 100;
        playerManager4.visible_lng = 100;
        const request_body4 = {
            "id": "Gamma_id",
            "lat": 37.7749,
            "lng": -122.4194,
        }
        playerManager4.invisibilityEnd = Date.now()+10000
        const req5 = httpMocks.createRequest({method: 'POST', url: '/api/sendPlayerUpdate', body: request_body4});
        const res5 = httpMocks.createResponse();
        await sendLocationUpdate(req5, res5);
        // Make sure visible lat and lng weren't changed
        assert.strictEqual(res5._getData(), "Success");
        assert.strictEqual(res5._getStatusCode(), 200);
        assert.strictEqual(playerManager4.visible_lat, 100);
        assert.strictEqual(playerManager4.visible_lng, 100);
        assert.strictEqual(playerManager4.lat, 37.7749);
        assert.strictEqual(playerManager4.lng, -122.4194);

        //  // Delete a player
        // delete playerToID["Delta"];
        // delete playerInfo["Delta_id"]; 
        // teamSouth.splice(0,1);
        // // // Delete a player
        // delete playerToID["Beta"];
        // delete playerInfo["Beta_id"]; 
        // teamSouth.splice(0,1);

        // // // Delete a player
        //  delete playerToID["Bob"];
        //  //delete IDtoPlayer["Bob_id"]; 
        //  delete playerInfo["Bob_id"];
        //  teamNorth.splice(0,1);
        
        //  gameEvents.splice(0,4);
        //  statusUpdates.splice(0,3);

        
    })
})