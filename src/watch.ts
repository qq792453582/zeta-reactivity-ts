import { ComputationNode, ComputationOptions } from "./computation";

const levels: number[] = [];

let queues = new Map<number, Set<WatchNode>>();
let flashingQueue = new Set<WatchNode>(); // 刷新中的队列，用于防止循环刷新

export class WatchNode extends ComputationNode {
	
	constructor(private callback?: () => void,
				public override options?: ComputationOptions) {
		super(options);
	}
	
	protected override onDirty() {
		super.onDirty();
		addFlushQueue(this);
	}
	
	protected override onUpdate(): void {
		super.onUpdate();
		
		this.callback!();
	}
	
	protected override onDispose() {
		super.onDispose();
		
		delete this.callback;
		
		const queue = queues.get(this.level);
		
		if (queue) {
			queue.delete(this);
		}
	}
	
}

export type Watch = (() => void) & { node: WatchNode }

export interface WatchOptions extends ComputationOptions {
	/** 第一次调用延迟执行 */
	defer?: boolean;
}

/**
 * 立运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新执行。
 */
export function createWatch(fn: () => void, options?: WatchOptions): Watch {
	const watch = new WatchNode(fn, options);
	
	if (options?.defer) {
		addFlushQueue(watch);
	}
	else {
		watch.update();
	}
	
	return Object.assign(watch.run.bind(watch), { node: watch });
}

export function addFlushQueue(watch: WatchNode) {
	let queue = queues.get(watch.level);
	
	if (!queue) {
		queue = new Set();
		queues.set(watch.level, queue);
		
		levels.push(watch.level);
		levels.sort();
	}
	
	queue.add(watch);
}

export function flushWatches() {
	
	// 优先层级更低的watch，因为当层级更低的watch更新时，会清空层级更高的watch
	for (const level of levels) {
		const queue = queues.get(level)!;
		
		queues.set(level, flashingQueue);
		
		flashingQueue = queue;
		
		for (const watch of flashingQueue) {
			watch.update();
		}
		
		flashingQueue.clear();
	}
	
}

export function resetWatches() {
	for (const [, queue] of queues) {
		queue.clear();
	}
	flashingQueue.clear();
}
