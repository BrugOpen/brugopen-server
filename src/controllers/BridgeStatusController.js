
import EventEmitter from 'node:events';

class BridgeStatusController {

	/**
	 *
	 * @param {EventEmitter} eventEmitter
	 */
	constructor(eventEmitter) {

		this.eventEmitter = eventEmitter;
		this.bridges = [];
		this.lastUpdate = Math.round(new Date().getTime() / 1000);

	}

	processOperationStatus(operationStatus) {

		const bridgeName = operationStatus.bridge;

		const updatedOperation = {};

		updatedOperation.id = operationStatus.id;
		updatedOperation.start = operationStatus.start;
		updatedOperation.end = ('end' in operationStatus) ? operationStatus.end : null;
		updatedOperation.certainty = operationStatus.certainty;

		const now = Math.round(new Date().getTime() / 1000);

		if (updatedOperation.end != null) {

			if (updatedOperation.end < now) {

				updatedOperation.ended = true;

			}

		}

		let existingBridgeStatus;

		for (let i = 0; i < this.bridges.length; i++) {

			if (this.bridges[i].name == bridgeName) {

				existingBridgeStatus = this.bridges[i];
				break;

			}

		}

		if (existingBridgeStatus) {

			// clone existing bridge status
			const mergedBridgeStatus = JSON.parse(JSON.stringify(existingBridgeStatus));

			// create merged operations
			const updatedOperations = [];

			for (var i = 0; i < existingBridgeStatus.lastOperations.length; i++) {

				const operation = existingBridgeStatus.lastOperations[i];

				if (operation.id == updatedOperation.id) {

					continue;

				}

				updatedOperations.push(operation);

			}

			updatedOperations.push(updatedOperation);

			mergedBridgeStatus.lastOperations = this.createCleanOperations(updatedOperations, now);

			// compare existingBridgeStatus with updatedBridgeStatus
			const bridgeUpdated = this.bridgeStatusUpdated(existingBridgeStatus, mergedBridgeStatus);

			if (bridgeUpdated) {

				console.debug('Operation ' + operationStatus.id + ' causes status update');

				// update operations in existingBridgeStatus
				existingBridgeStatus.lastOperations = mergedBridgeStatus.lastOperations;

				// broadcast bridge status
				this.broadcastBridgeStatus(existingBridgeStatus);

			} else {

				console.debug('Operation ' + operationStatus.id + ' update does not cause bridge status update');

			}

		} else {

			console.log('Bridge ' + bridgeName + ' not found while processing operation ' + operationStatus.id);

		}

	};

	processCompleteBridgeStatus(bridges) {

		// process each bridge

		for (var i = 0; i < bridges.length; i++) {

			this.processBridgeStatus(bridges[i]);

		}

		// detect gone bridges

	}

	processBridgeStatus(bridgeStatus) {

		if (typeof (bridgeStatus.name) == 'undefined') {

			return;

		}

		const bridgeName = bridgeStatus.name;

		let existingBridgeStatus;

		for (let i = 0; i < this.bridges.length; i++) {

			if (this.bridges[i].name == bridgeName) {

				existingBridgeStatus = this.bridges[i];
				break;

			}

		}

		const now = Math.round(new Date().getTime() / 1000);

		const updatedBridgeStatus = this.createUpdatedBridgeStatus(existingBridgeStatus, bridgeStatus, now);

		let broadcastBridgeStatus;

		if (existingBridgeStatus == null) {

			this.bridges.push(updatedBridgeStatus);

			this.lastUpdate = now;

			broadcastBridgeStatus = updatedBridgeStatus;

		} else {

			// compare existingBridgeStatus with updatedBridgeStatus

			const bridgeUpdated = this.bridgeStatusUpdated(existingBridgeStatus, updatedBridgeStatus);

			if (bridgeUpdated) {

				console.log("Bridge status for " + bridgeName + " was updated");

				// update bridge in local status

				const updatedBridges = [];

				for (var i = 0; i < this.bridges.length; i++) {

					if (this.bridges[i].name == bridgeName) {

						updatedBridges.push(updatedBridgeStatus);

					} else {

						updatedBridges.push(this.bridges[i]);

					}

				}

				this.bridges = updatedBridges;

				this.lastUpdate = Math.round(new Date().getTime() / 1000);

				broadcastBridgeStatus = updatedBridgeStatus;

			}

		}

		if (broadcastBridgeStatus) {

			// broadcast complete bridge update
			this.broadcastBridgeStatus(broadcastBridgeStatus);

		}

	}

	createUpdatedBridgeStatus(existingBridgeStatus, bridgeStatus, time) {

		const updatedBridgeStatus = {};

		let allOperations = [];

		if (existingBridgeStatus) {

			allOperations = JSON.parse(JSON.stringify(existingBridgeStatus.lastOperations));

		}

		for (var i = 0; i < bridgeStatus.lastOperations.length; i++) {

			const operation = bridgeStatus.lastOperations[i];

			let existingOperation;

			for (var j = 0; j < allOperations.length; j++) {

				if (allOperations[j].id == operation.id) {

					existingOperation = allOperations[j];
					break;

				}

			}

			if (existingOperation) {

				if (operation.end != null) {

					existingOperation.end = operation.end;

				}

				if (('vesselTypes' in operation) && (operation.vesselTypes != null) && (operation.vesselTypes.length > 0)) {

					existingOperation.vesselTypes = operation.vesselTypes;

				}

			} else {

				allOperations.push(operation);

			}

		}

		// sort operations
		allOperations.sort(this.compareOperationsByStartDesc);

		// keep max 10 completed operations (certainty = 3) + next starting operation
		const completedCertainOperations = [];
		let nextStartingOperation;
		let activeStartedOperation;

		for (var i = 0; i < allOperations.length; i++) {

			const operation = allOperations[i];

			if ((operation.start != null) && (operation.start > time)) {

				nextStartingOperation = operation;

			} else if ((operation.start != null) && (operation.start <= time) && (operation.end == null || operation.end >= time) && (operation.certainty == 3)) {

				activeStartedOperation = operation;

			} else if ((operation.end != null) && (operation.end < time) && (operation.certainty == 3)) {

				operation.ended = true;
				completedCertainOperations.push(operation);

			}

		}

		while (completedCertainOperations.length > 10) {

			// remove oldest operation
			completedCertainOperations.pop();

		}

		const mergedOperations = [];

		if (nextStartingOperation) {

			mergedOperations.push(nextStartingOperation);

		}

		if (activeStartedOperation) {

			mergedOperations.push(activeStartedOperation);

		}

		for (var i = 0; i < completedCertainOperations.length; i++) {

			mergedOperations.push(completedCertainOperations[i]);

		}

		updatedBridgeStatus.name = bridgeStatus.name;
		updatedBridgeStatus.title = bridgeStatus.title;
		updatedBridgeStatus.city = bridgeStatus.city;

		if (bridgeStatus.city2) {

			updatedBridgeStatus.city2 = bridgeStatus.city2;

		}

		updatedBridgeStatus.location = bridgeStatus.location;
		updatedBridgeStatus.lastOperations = mergedOperations;
		updatedBridgeStatus.lastWeekStats = bridgeStatus.lastWeekStats;
		updatedBridgeStatus.nearbyBridges = bridgeStatus.nearbyBridges;

		return updatedBridgeStatus;

	}

	createCleanOperations(operations, time) {

		const allOperations = JSON.parse(JSON.stringify(operations));

		// sort operations
		allOperations.sort(this.compareOperationsByStartDesc);

		// keep max 10 completed operations (certainty = 3) + next starting operation
		const completedCertainOperations = [];
		let nextStartingOperation;
		let activeStartedOperation;

		for (var i = 0; i < allOperations.length; i++) {

			const operation = allOperations[i];

			if ((operation.start != null) && (operation.start > time)) {

				nextStartingOperation = operation;

			} else if ((operation.start != null) && (operation.start <= time) && (operation.end == null || operation.end >= time) && (operation.certainty == 3)) {

				activeStartedOperation = operation;

			} else if ((operation.end != null) && (operation.end < time) && (operation.certainty == 3)) {

				operation.ended = true;
				completedCertainOperations.push(operation);

			}

		}

		while (completedCertainOperations.length > 10) {

			// remove oldest operation
			completedCertainOperations.pop();

		}

		const mergedOperations = [];

		if (nextStartingOperation) {

			mergedOperations.push(nextStartingOperation);

		}

		if (activeStartedOperation) {

			mergedOperations.push(activeStartedOperation);

		}

		for (var i = 0; i < completedCertainOperations.length; i++) {

			mergedOperations.push(completedCertainOperations[i]);

		}

		return mergedOperations;

	}

	bridgeStatusUpdated(existingBridgeStatus, updatedBridgeStatus) {

		const str1 = JSON.stringify(existingBridgeStatus);
		const str2 = JSON.stringify(updatedBridgeStatus);

		const bridgeStatusUpdated = (str1 != str2);

		return bridgeStatusUpdated;

	}

	createOperationUpdates(previousOperations, currentOperations) {

		const updatedOperations = [];

		for (var i = 0; i < currentOperations.length; i++) {

			const currentOperation = currentOperations[i];

			var existingOperation;

			for (var j = 0; j < previousOperations.length; j++) {

				if (previousOperations[j].id == currentOperation.id) {

					existingOperation = currentOperation;
					break;

				}

			}

			var operationUpdated = false;

			if (existingOperation) {

				const str1 = JSON.stringify(existingOperation);
				const str2 = JSON.stringify(currentOperation);

				operationUpdated = (str1 != str2);

			} else {

				operationUpdated = true;

			}

			if (operationUpdated) {

				updatedOperations.push(currentOperation);

			}

		}

		return updatedOperations;

	}

	compareOperationsByStartDesc(a, b) {
		if ((a.start != null) && (b.start != null)) {
			if (a.start < b.start)
				return 1;
			if (a.start > b.start)
				return -1;
		}
		return 0;
	}

	broadcastBridgeStatus(bridgeStatus) {

		const broadcastMessage = {};
		broadcastMessage.type = 'bridge';
		broadcastMessage.status = bridgeStatus;
		broadcastMessage.time = Math.round(new Date().getTime() / 1000);

		this.eventEmitter.emit('broadcast', broadcastMessage);

	}

}

export { BridgeStatusController };
