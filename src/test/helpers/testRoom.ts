// Test double for a `ws` WebSocket, used in place of node-mocks-http's req/res.
// Structurally compatible with what GameRoom.registerClient/sendTo/broadcast need
// (readyState, send, on) - cast to WebSocket when passed into registerClient.
export class FakeSocket {
    sent: any[] = [];
    readyState = 1; // matches ws.WebSocket.OPEN

    send(data: string): void {
        this.sent.push(JSON.parse(data));
    }

    on(): void {
        // Tests invoke handlers directly rather than through the message/close
        // dispatch machinery, so there's nothing to wire up here.
    }
}
