import { createServer as createHttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { BridgeStatusController } from './src/controllers/BridgeStatusController.js';
import { HttpRequestProcessor } from './src/controllers/HttpRequestProcessor.js';
import { WebSocketController } from './src/controllers/WebSocketController.js';
import { StatusUpdateController } from './src/controllers/StatusUpdateController.js';

const initUrl = process.env.STATUS_URL;
const listenPortHttp = process.env.HTTP_PORT || 3080;
const listenPortWebSocket = process.env.WEBSOCKET_PORT || 3081;
const updateInterval = 60 * 1000;

if (!initUrl) {

	console.log('Error: environment variable STATUS_URL must be set');
	process.exit(1);

}

console.log('Starting BrugOpen server');

// setup event emitter
const eventEmitter = new EventEmitter();

// setup controllers
const bridgeStatusController = new BridgeStatusController(eventEmitter);
const httpRequestProcessor = new HttpRequestProcessor(eventEmitter, bridgeStatusController);
const statusUpdateController = new StatusUpdateController(bridgeStatusController, initUrl, updateInterval);

// create HTTP server
const handleHttpRequest = httpRequestProcessor.handleHttpRequest.bind(httpRequestProcessor);
const httpServer = createHttpServer(handleHttpRequest);
httpServer.listen(listenPortHttp, () => {
    // Callback triggered when http server is successfully listening.
    console.log("HTTP server listening on port " + listenPortHttp);
});

// create WebSocket server
const webSocketServer = new WebSocketServer({ port: listenPortWebSocket }, () => {
    // callback triggered when websocket server is successfully listening
    console.log("WebSocket server listening on port " + listenPortWebSocket);
});
const webSocketController = new WebSocketController(webSocketServer, bridgeStatusController);
webSocketServer.on('connection', webSocketController.handleWebSocketConnection.bind(webSocketController));

// connect event listeners
eventEmitter.on('operationStatus', bridgeStatusController.processOperationStatus.bind(bridgeStatusController));
eventEmitter.on('bridgeStatus', bridgeStatusController.processBridgeStatus.bind(bridgeStatusController));
eventEmitter.on('broadcast', webSocketController.broadcast.bind(webSocketController));

// initialize status
setTimeout(() => {
	statusUpdateController.initBridges();
}, 0);
