import { checkValueEquals, ValueEqualsFn } from "./equality";
import { producerAccessed, ProducerNode, producerNotifyConsumers, producerUpdateVersion } from "./producer";

export interface SignalNode<T> extends ProducerNode {
	value: T;
	equalsFn?: ValueEqualsFn<T>;
}

export type Signal<T> = (() => T) & {
	node: SignalNode<T>
	
	/** 返回 signal 的当前值 */
	value: T;
	
	peek(): T;
	
	/**
	 * 设置 signal 的值，并在该值实际更改时更新 signal（触发依赖项重新运行）
	 * 默认情况下，当调用 signal 的 setter 时，根据 JavaScript 的 Object.is 函数的返回结果，仅当新值实际上不同于旧值时，signal 才会更新（并导致依赖项重新运行）
	 */
	set(value: T): void
	
	/**
	 * 标记为已变更并返回当前值
	 * @param updater 传递一个函数，把当前值作为参数传递到函数中
	 * */
	update(updater?: (value: T) => void): T;
}

export function getSignal<T>(node: SignalNode<T>) {
	producerAccessed(node);
	return node.value;
}

export function peekSignal<T>(node: SignalNode<T>) {
	return node.value;
}

export function setSignalValue<T>(node: SignalNode<T>, value: T) {
	if (!checkValueEquals(node.value, value, node.equalsFn)) {
		node.value = value;
		notifySignalValueChanged(node);
	}
}

export function updateSignal<T>(node: SignalNode<T>, updater: (value: T) => void) {
	updater(node.value);
	notifySignalValueChanged(node);
	
	return node.value;
}

export function notifySignalValueChanged<T>(node: SignalNode<T>) {
	producerUpdateVersion(node);
	producerNotifyConsumers(node);
}

/**
 * 创建一个可直接设置或更新的 "信号"。
 * @param value
 * @param equalsFn
 */
export function createSignal<T>(value: T, equalsFn?: ValueEqualsFn<T>): Signal<T> {
	const node: SignalNode<T> = {
		value,
		equalsFn
	};
	
	const signal = (getSignal<T>).bind(undefined, node) as Signal<T>;
	
	Object.defineProperty(signal, "value", {
		get() {
			return getSignal(node);
		},
		set(newValue: T) {
			setSignalValue(node, newValue);
		},
		enumerable: true,
	});
	
	signal.node = node;
	signal.peek = (peekSignal<T>).bind(undefined, node);
	signal.set = (setSignalValue<T>).bind(undefined, node);
	signal.update = (updateSignal<T>).bind(undefined, node);
	
	return signal;
	
}
