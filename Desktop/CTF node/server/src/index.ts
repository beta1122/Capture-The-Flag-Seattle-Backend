import express, { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createRoom, findRoomByCode } from "./rooms/roomRegistry";
import { CTFMatchRoom } from "./ctf/CTFMatchRoom";
import { getDb } from "./ctf/persistence/db";

const port: number = Number(process.env.PORT ?? 8088);
const host: string = process.env.HOST ?? "0.0.0.0";

// Runs the sqlite migration eagerly on boot rather than waiting for the first match to
// end, so a bad DB path/permissions issue fails fast instead of silently on game-over.
getDb();

const app: Express = express();
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.post("/api/createMatch", (_req, res) => {
    const room = createRoom((roomCode) => new CTFMatchRoom(roomCode));
    res.status(200).json({ roomCode: room.roomCode });
});

app.post("/api/joinMatch", async (req, res) => {
    const roomCode = req.body?.roomCode;
    const playerName = req.body?.playerName;
    if (typeof roomCode !== "string" || typeof playerName !== "string") {
        res.status(401).send("roomCode and playerName are required strings");
        return;
    }
    const room = findRoomByCode<CTFMatchRoom>(roomCode);
    if (room === undefined) {
        res.status(404).send("No match found with that room code");
        return;
    }
    const idOrError = await room.teamManager.addPlayerToGame(playerName);
    if (typeof idOrError !== "string") {
        res.status(idOrError.errorCode).send(idOrError.description);
        return;
    }
    const playerId = idOrError;
    if (room.hostPlayerId === undefined) {
        room.hostPlayerId = playerId;
    }
    res.status(200).json({ playerId, roomCode: room.roomCode, isHost: room.hostPlayerId === playerId });
});

// Clients connect with wss://host/ws?roomCode=XXXX&playerId=<id returned from /api/joinMatch>.
// The playerId doubles as the connection credential (same role the old REST id played) -
// it's an unguessable UUID minted only for the player who legitimately joined that match,
// so no separate session token is needed. Reusing the same roomCode+playerId after a
// dropped connection (phone locked, went through a tunnel, etc.) is how reconnection works -
// there's no separate token or grace-window timer, the player's state just sits in
// room.playerManagers/teamManager until they reconnect.
httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const roomCode = url.searchParams.get("roomCode") ?? "";
    const playerId = url.searchParams.get("playerId") ?? "";

    const room = findRoomByCode<CTFMatchRoom>(roomCode);
    const isKnownPlayer = room !== undefined
        && (room.teamManager.IDToPlayer[playerId] !== undefined || room.playerManagers.has(playerId));

    if (room === undefined || !isKnownPlayer) {
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        room.registerClient(playerId, ws);
        // A reconnecting player needs whatever snapshot matches where the match actually
        // is right now - a preGameUpdate would be meaningless (and wrong) to send to
        // someone reconnecting mid-match.
        if (room.gameState === "preGame") {
            room.sendTo(playerId, { type: "preGameUpdate", payload: room.teamManager.getPreGameInfo() });
        } else {
            room.sendTo(playerId, { type: "gameUpdate", payload: room.getGameUpdate() });
            // Private resync: this player's own veto/invisibility timers, active challenge,
            // double-up state and coins - all otherwise only ever delivered as one-shot
            // *Result responses, so lost on app relaunch without this.
            const playerManager = room.playerManagers.get(playerId);
            if (playerManager !== undefined) {
                room.sendTo(playerId, { type: "playerState", payload: playerManager.getPlayerState() });
            }
        }
    });
});

httpServer.listen(port, host, () => console.log(`Server listening on ${host}:${port}`));
