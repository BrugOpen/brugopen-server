import { get as httpGet} from 'node:http';
import { get as httpsGet} from 'node:https';
import { BridgeStatusController } from './BridgeStatusController.js';

class StatusUpdateController {

    /**
     * @param {BridgeStatusController} bridgeStatusController
     * @param {string} initUrl
     * @param {int} interval
     */
    constructor(bridgeStatusController, initUrl, interval) {

        /**
         * @type {BridgeStatusController}
         */
        this.bridgeStatusController = bridgeStatusController;

        /**
         * @type {string}
         */
        this.initUrl = initUrl;

        /**
         * @type {int}
         */
        this.interval = interval;

    }

    processInitBridgesResponse(res) {

        var statusCode = res.statusCode;
        var contentType = res.headers['content-type'];

        var error;
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' +
                                'Status Code: ' + statusCode);
        } else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' +
                                'Expected application/json but received ' + contentType);
        }

        if (error) {

            console.error(error.message);
            // consume response data to free up memory
            res.resume();
            return;

        }

        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', function() { this.processInitBridgesResponseBody(rawData); }.bind(this));

    }

    processInitBridgesResponseBody(body) {

        try {

            const parsedData = JSON.parse(body);

            if (parsedData != null) {

                if ((parsedData.lastUpdate != null) && (parsedData.bridges != null)) {

                    if (parsedData.bridges.length > 0) {

                        // process bridge status events
                        this.bridgeStatusController.processCompleteBridgeStatus(parsedData.bridges);

                    } else {

                        console.log('Insufficient bridges in status response');

                    }

                }

            }

        } catch (e) {
            console.error('Error processing status response body: ' + e.message);
        }

    }

    processInitBridgesError(e) {

        console.error('Could not get bridges', e);

    };

    initBridges() {

        console.log('Retrieving current state from ' + this.initUrl);

        var callback = this.processInitBridgesResponse.bind(this);
        var onError = this.processInitBridgesError.bind(this);

        if (this.initUrl.startsWith('https://')) {

            httpsGet(this.initUrl, callback).on('error', onError);

        } else {

            httpGet(this.initUrl, callback).on('error', onError);

        }

        if (this.interval > 0) {

            var onTimeout = this.initBridges.bind(this);

            setTimeout(onTimeout, this.interval);

        }

    }

}

export { StatusUpdateController };
