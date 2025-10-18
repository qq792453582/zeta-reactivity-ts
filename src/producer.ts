import { getActiveConsumer } from "./activeConsumer";
import { ComputationNode, markedComputationDirty } from "./computation";

export interface ProducerNode {
	liveComputations?: Set<ComputationNode>;
	
	version?: number;
	
	recomputeValue?(): void;
}

export let inNotificationPhase = false;

export function producerAccessed(producer: ProducerNode) {
	
	if (inNotificationPhase) {
		throw new Error("Assertion error: signal read during notification phase");
	}
	
	const activeConsumer = getActiveConsumer();
	
	if (!activeConsumer
		|| activeConsumer.disposed
		|| !(activeConsumer instanceof ComputationNode)) {
		return;
	}
	
	activeConsumer.OnAccessed(producer);
}

export function producerNotifyConsumers(producer: ProducerNode) {
	if (!producer.liveComputations) {
		return;
	}
	
	const prev = inNotificationPhase;
	inNotificationPhase = true;
	
	for (const computation of producer.liveComputations) {
		markedComputationDirty(computation)
	}
	
	inNotificationPhase = prev;
}

export function producerUpdateVersion(producer: ProducerNode) {
	producer.version ??= 0;
	producer.version++;
}
