import EventEmitter from 'node:events';
import { IncomingMessage, ServerResponse } from 'node:http';
import { BridgeStatusController } from './BridgeStatusController.js';

class HttpRequestProcessor {

    /**
     * @type {EventEmitter}
     */
    eventEmitter;

    /**
     * @type {BridgeStatusController}
     */
    bridgeStatusController;

    /**
     * @type {number}
     */
    nextEventClientId = 1;

    /**
     * @type {Array.<Array.<number, IncomingMessage, ServerResponse>>}
     */
    eventClients = [];

    /**
     *
     * @param {EventEmitter} eventEmitter
     * @param {BridgeStatusController} bridgeStatusController
     */
    constructor(eventEmitter, bridgeStatusController) {

        this.eventEmitter = eventEmitter;
        this.bridgeStatusController = bridgeStatusController;

    }

    /**
     *
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     */
    handleHttpRequest(request, response) {

        var res = '';

        let requestBodyParts = [];

        if (request.method == 'POST') {

            request.on('error', err => {
                console.error('Request error: ' + err);
            });

            request.on('data', chunk => {
                requestBodyParts.push(chunk);
            });

            request.on('end', () => {

                let error = '';

                response.on('error', err => {
                    console.error('Response error: ' + err);
                });

                const body = Buffer.concat(requestBodyParts).toString();

                if (body != '') {

                    let requestObject;

                    try {

                        requestObject = JSON.parse(body);

                    } catch (e) {

                        console.log('Could not parse JSON body: ' + e.toString());

                    }

                    if (requestObject != null) {

                        if (('type' in requestObject) && (requestObject.type != '')) {

                            if (requestObject.type == 'operation') {

                                try {

                                    this.eventEmitter.emit('operationStatus', requestObject);

                                } catch (e) {

                                    error = 'Error while emitting operationStatus event';

                                    console.log(error + ': ' + e);

                                }

                            } else if (requestObject.type == 'bridge') {

                                try {

                                    this.eventEmitter.emit('bridgeStatus', requestObject);

                                } catch (e) {

                                    error = 'Error while emitting bridgeStatus event';

                                    console.log(error + ': ' + e);

                                }

                            } else {

                                error = 'unknown type: \'' + requestObject.type + '\'';

                            }

                        } else {

                            error = 'property \'type\' not found in request body';

                        }

                    } else {

                        error = 'cannot process body';

                    }

                } else {

                    error = 'JSON body expected';

                }

                if (error != '') {

                    console.log('Error on POST request: ' + error);

                    response.writeHead(400); // bad request
                    response.end(error);

                } else {

                    response.writeHead(202); // accepted
                    response.end();

                }

            });

        } else if (request.method == 'GET') {

            // print full status

            var data = {};
            data.lastUpdate = this.bridgeStatusController.lastUpdate;
            data.bridges = this.bridgeStatusController.bridges;

            var json = JSON.stringify(data);

            response.setHeader('Content-type', 'application/json');
            response.end(json);

        } else {

            response.writeHead(405); // method not allowed
            response.end();

        }

    }

    /**
     *
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     */
    handleHttpEventRequest(request, response) {

        const clientId = this.nextEventClientId;

        console.log('Event client ' + clientId + ' connected');

        response.setHeader('X-Accel-Buffering', 'no');
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');

        var data = {};

        if ((this.bridgeStatusController.lastUpdate != null) && (this.bridgeStatusController.bridges.length > 0)) {

            data.type = 'init';
            data.lastUpdate = this.bridgeStatusController.lastUpdate;
            data.bridges = this.bridgeStatusController.bridges;

        }

        response.write('retry: 10000\n');

        var msg = JSON.stringify(data);

        try {
            response.write('data: ' + msg + '\n');
        } catch (e) {
            console.log('Could not send init message', e);
        }

        response.write('\n');

        this.eventClients.push([this.nextEventClientId, request, response]);

        // When client closes connection, stop sending events
        const onSocketClose = function (clientId) {
            console.log('Event client ' + clientId + ' disconnected');
            this.eventClients = this.eventClients.filter((client) => {
                return client[0] != clientId;
            });
            response.end();
        }.bind(this, clientId);
        request.socket.on('close', onSocketClose);

        this.nextEventClientId++;

    }

    /**
     *
     * @param {Object} messageObject
     */
    broadcast(messageObject) {

        try {

            const messageText = JSON.stringify(messageObject);
            this.eventClients.forEach((client) => {
                const response = client[2];
                response.write('data: ' + messageText + '\n\n');
            });

        } catch (e) {

            console.log("Could not broadcast message: " + e);

        }

    }

}

export { HttpRequestProcessor };
