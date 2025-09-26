import { SafeRequest, SafeResponse } from "../common/types";
import { checkParam} from "../common/utils";
import { gameController } from "../modules/GameController";
// This file will contain all the pregame routes of the game.
// These include all functionality for handling joins, 
// leaves, switching teams, and requesting info about 
// other players.

// Many of these endpoints are meant solely for the preGame
// If gameState is not "pregame", may send error status.

/**
 * For pre-game, handles joining the game by adding a player in the player array
 * Will fail if the player did not enter an unique name.
 * @param req {playerName: String}
 * @param res {id: string} 
 * unique id for player to keep
 * as a password to access endpoints
 */
export const joinGame = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
    // Type checking: non-mutable
    const name = req.body.playerName;
    if (!checkParam<string>(name, "string", "Player Name from join game endpoint", res)){
        return;
    }

    // Check all the states that are mutable in the lock
    const response = await gameController.teamManager.addPlayerToGame(name)
    if(typeof response == "string"){
        res.status(200).send({id: response});
        return;
    }
    res.status(response.errorCode).send(response.description);
}


/**
 * For pre-game, handles joining a team. 
 * @param req The request object: {id: string,team: string}
 * If team is not a valid team, then assigns the player to players without teams
 */
export const joinTeam = async (req: SafeRequest, res: SafeResponse): Promise<void> => {
    // Type checking
    const id = req.body.id;
    if (!checkParam<string>(id, "string", "Id from join team endpoint", res)){
        return;
    }
    const team = req.body.team;
    if (!checkParam<string>(team, "string", "Team parameter from join team endpoint", res)){
        return;
    }
    if(team!== "North" && team !== "South"){
        res.status(403).send("Team invalid");
        return;
    }
    const response = await gameController.teamManager.movePlayerIntoTeam(id,team)
    if(response == undefined){
        res.status(200).send("Success");
        return;
    }
    res.status(response.errorCode).send(response.description);
};


/**
 * Endpoint for updating which teams to show, and 
 * game status on the client end.
 * 
 * Should be used periodically in the preGame, 
 * works outside the pregame, but only sends the same info.
 * 
 * Should be also used to update gameState when it changes
 * from preGame to inGame
 * 
 * @param req getRequest
 * @param res A set of what players are on which teams
 * { gameState, playersWithoutTeams: string[], teamNorth: string[] , teamSouth: string[]}
 */
export const getPreGameInfo = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
    req
    res.status(200).send(gameController.teamManager.getPreGameInfo())
    return;
}

/**
 * Removes from the player list
 * Should only be used in preGame
 * 
 * @param req {id: string} to disconnect
 * @param res status message
 */
export const leaveGame = async (req: SafeRequest, res: SafeResponse): Promise<void> => {
    // Type checking
    const id = req.body.id;
    if (!checkParam<string>(id, "string", "id from leaveGame endpoint", res)){
        return;
    }
    const response = await gameController.teamManager.removePlayerFromGame(id)
    if(response == undefined){
        res.status(200).send("Success");
        return;
    }
    res.status(response.errorCode).send(response.description);
}

