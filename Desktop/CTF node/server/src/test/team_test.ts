import * as assert from 'assert';
import * as httpMocks from 'node-mocks-http';
import { joinTeam, joinGame,  leaveGame, getPreGameInfo} from '../routes/team_routes';
import { gameController } from '../modules/GameController';
describe('pregame_routes', function() {
  it('joinGame', async function() {
     await gameController.teamManager.resetPreGame();
     gameController.gameState = "preGame"
      // Test basic join
      const req1 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinGame', body: {playerName: 'Bob'} });
      const res1 = httpMocks.createResponse();
      await joinGame(req1, res1);
      assert.strictEqual(res1._getStatusCode(), 200);
      const bob_id = res1._getData().id;

      assert.notStrictEqual(bob_id, undefined);

      // Enter the same player, should give error
      const res2 = httpMocks.createResponse();
      await joinGame(req1, res2);
      assert.strictEqual(res2._getStatusCode(), 401);
      const message = res2._getData(); // gets string or object passed to res.send()
      
      assert.strictEqual(message, 'There already is a player with this name in the game.');
      
      // Test another request
      const req3 = httpMocks.createRequest(
        {method: 'POST', url: '/api/joinGame', body: {playerName: 'Beta'} });
      const res3 = httpMocks.createResponse();
      await joinGame(req3, res3);
      assert.strictEqual(res3._getStatusCode(), 200);

      await gameController.teamManager.resetPreGame();
    });

  it('joinTeam', async function() {
      await gameController.teamManager.resetPreGame();
      // Test joining team before being in the game.
      const req1 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinTeam', body: {id: 'Bob', team: 'North'}});
      const res1 = httpMocks.createResponse();
      await joinTeam(req1, res1);
      console.log(gameController.teamManager.IDToPlayer);
      assert.strictEqual(res1._getStatusCode(), 401);

      assert.strictEqual(res1._getData(), "ID not found");
      

      // Make sure nothing happened with the team
      assert.deepEqual(gameController.teamManager.teamNorth,[]);

      // Ok, lets add the player into the game first now
      const req2 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinGame', body: {playerName: 'Bob'} });
      const res2 = httpMocks.createResponse();
      await joinGame(req2, res2);
      assert.strictEqual(res2._getStatusCode(), 200);
      const bob_id = res2._getData().id;
      assert.notStrictEqual(bob_id, undefined);

      // Now redo the joining team
      const req3 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinTeam', body: {id: bob_id, team: 'North'}});
      const res3 = httpMocks.createResponse();
      await joinTeam(req3, res3);
      assert.strictEqual(res3._getData(), "Success");
      assert.strictEqual(res3._getStatusCode(), 200);
      
        //   Check the status of the server
      assert.deepEqual(gameController.teamManager.teamNorth,["Bob"]);
      
      // Join a different team now 
      const req4 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinTeam', body: {id: bob_id, team: 'South'}});
      const res4 = httpMocks.createResponse();
      await joinTeam(req4, res4);
      assert.strictEqual(res4._getStatusCode(), 200);

      // Check the status of the server 
     assert.deepEqual(gameController.teamManager.teamNorth,[]);
     assert.deepEqual(gameController.teamManager.teamSouth,["Bob"]);

      // Join any other team 
      const req5 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinTeam', body: {id: bob_id, team: 'teamSfsifljskfslkfslkuth'}});
      const res5 = httpMocks.createResponse();
      await joinTeam(req5, res5);
      assert.strictEqual(res5._getStatusCode(), 403);

      // Check the status of the server
    assert.deepEqual(gameController.teamManager.teamNorth,[]);
    assert.deepEqual(gameController.teamManager.teamSouth,["Bob"]);
    assert.deepEqual(gameController.teamManager.playersWithoutTeams,[]);

      gameController.teamManager.resetPreGame();
  });

  it('leaveGame', async function() {
      // Add a player first

      const req1 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinGame', body: {playerName: 'Beta'} });
      const res1 = httpMocks.createResponse();
      await joinGame(req1, res1);
      assert.strictEqual(res1._getStatusCode(), 200);
      const beta_id = res1._getData().id;
      assert.notStrictEqual(beta_id, undefined);

      const req2 = httpMocks.createRequest(
          {method: 'POST', url: '/api/joinGame', body: {playerName: 'Bob'} });
      const res2 = httpMocks.createResponse();
      await joinGame(req2, res2);
      assert.strictEqual(res2._getStatusCode(), 200);
      const bob_id = res2._getData().id;
      assert.notStrictEqual(bob_id, undefined);

        gameController.teamManager.teamNorth.push("Beta");
      
      // Remove Bob
      const req5 = httpMocks.createRequest({method: 'POST',url: "/api/leaveGame", body: {id: bob_id}})
      const res5 = httpMocks.createResponse()
      await leaveGame(req5,res5)
      assert.strictEqual(res5._getStatusCode(), 200)

      // Check status
     assert.deepEqual(gameController.teamManager.teamNorth, ["Beta"]);

      // Remove Beta
      const req = httpMocks.createRequest({method: 'POST',url: "/api/leaveGame", body: {id: beta_id}})
      const res = httpMocks.createResponse()
      await leaveGame(req,res)
      assert.strictEqual(res._getStatusCode(), 200)

      // Check status
     assert.deepEqual(gameController.teamManager.teamNorth, []);
      gameController.teamManager.resetPreGame();
    });

    it('getPreGameInfo', function() {
      // Check data of default
      //resetPreGame();
      const req = httpMocks.createRequest({method: 'POST',url: "/api/getPreGameInfo", body: {}})
      const res = httpMocks.createResponse()
      getPreGameInfo(req,res);
      assert.strictEqual(res._getStatusCode(), 200)
      assert.deepEqual(res._getData(), {
        gameState: 'preGame',
        playersWithoutTeams: [],
        teamNorth: [],
        teamSouth:[]
      });

      // Add some players
    //   teamNorth.push("Bob");
    //   teamNorth.push("Beta");

    //   teamSouth.push("Beta2"); 

    //   playersWithoutTeams.push("Bob2");
    })

})