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

                                this.eventEmitter.emit('operationStatus', requestObject);

                            } else if (requestObject.type == 'bridge') {

                                this.eventEmitter.emit('bridgeStatus', requestObject);

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

}

export { HttpRequestProcessor };
