import express, { Express } from "express";
import { joinTeam, joinGame,  leaveGame, getPreGameInfo} from './routes/team_routes';
import bodyParser from 'body-parser';
import { startGame } from "./routes/routes_admin";
import { sendLocationUpdate } from "./routes/location_routes";
import { finishChallenge, startChallenge, vetoChallenge, viewChallenges } from "./routes/challenge_routes";
import { captureFlag, takeFlag } from "./routes/flag_routes";
import { handleTag } from "./routes/tag_routes";
import { useDoublePowerup, useInvisPot, useTicket } from "./routes/item_routes";
import { getGameInfo, updateCoins } from "./routes/info_routes";
import { hostname } from "./private";

// Configure and start the HTTP server.
const port: number = 8088;

const app: Express = express();

app.use(bodyParser.json());


//Pre game api endpoints
app.post("/api/joinTeam", joinTeam);  
app.post("/api/joinGame", joinGame);  
app.post("/api/leaveGame", leaveGame)
app.post("/api/getPreGameInfo", getPreGameInfo);

//In game api endpoints
app.post("/api/sendLocationUpdate", sendLocationUpdate);
app.post("/api/getGameInfo", getGameInfo);
app.post("/api/updateCoins", updateCoins)

// Challenges
app.post("/api/viewChallenges", viewChallenges);
app.post("/api/startChallenge", startChallenge);
app.post("/api/finishChallenge", finishChallenge);
app.post("/api/vetoChallenge", vetoChallenge);
// Flags
app.post("/api/takeFlag", takeFlag);
app.post("/api/captureFlag", captureFlag);
app.post("/api/handleTag", handleTag)

// Items
app.post("/api/useTicket", useTicket)
app.post("/api/useInvisibilityPotion", useInvisPot);
app.post("/api/useDoublePowerup", useDoublePowerup);

// Admin endpoints
app.post("/api/startGame", startGame)

app.listen(port, hostname, () => console.log(`Server listening on ${port}`));
