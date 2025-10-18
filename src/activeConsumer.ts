import type { ConsumerNode } from "./consumer";

let activeConsumer: ConsumerNode | undefined;

export function getActiveConsumer(): ConsumerNode | undefined {
	return activeConsumer;
}

export function setActiveConsumer(consumer?: ConsumerNode): ConsumerNode | undefined {
	const prev = activeConsumer;
	activeConsumer = consumer;
	return prev;
}
