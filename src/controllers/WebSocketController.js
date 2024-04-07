import { WebSocketServer, WebSocket } from 'ws';
import { BridgeStatusController } from './BridgeStatusController.js';

class WebSocketController {

    /**
     * @param {WebSocketServer} webSocketServer
     * @param {BridgeStatusController} bridgeStatusController
     */
    constructor(webSocketServer, bridgeStatusController) {

        /**
         * @type {WebSocketServer}
         */
        this.webSocketServer = webSocketServer;

        /**
         * @type {BridgeStatusController}
         */
        this.bridgeStatusController = bridgeStatusController;

    }

    /**
     *
     * @param {Object} messageObject
     */
    broadcast(messageObject) {

        try {

            const messageText = JSON.stringify(messageObject);
            this.webSocketServer.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(messageText);
                }
            });

        } catch (e) {

            console.err("Could not broadcast message: " + e);

        }

    }

    handleWebSocketConnectionClose(code, reason) {

        if ((reason != null) && (reason != '')) {
            console.log("Connection closed with code " + code + ', reason: ' + reason);
        } else {
            console.log("Connection closed with code " + code);
        }

    };

    handleWebSocketConnection(conn) {

        console.log("New websocket connection");

        var onError = this.handleWebSocketError.bind(this);
        conn.on('error', onError);

        var onClose = this.handleWebSocketConnectionClose.bind(this);
        conn.on("close", onClose);

        if ((this.bridgeStatusController.lastUpdate != null) && (this.bridgeStatusController.bridges.length > 0)) {

            var data = {};
            data.type = 'init';
            data.lastUpdate = this.bridgeStatusController.lastUpdate;
            data.bridges = this.bridgeStatusController.bridges;

            var msg = JSON.stringify(data);

            try {
                conn.send(msg);
            } catch (e) {
                console.log('Could not send init message', e);
            }

        }

    };

    handleWebSocketError(err) {

        console.log('Websocket error ' + err);

    }

}

export { WebSocketController };
