import { getActiveConsumer, setActiveConsumer } from "./activeConsumer";

export type ConsumerTeardown = (() => void) | ConsumerNode;

export function execTeardown(teardown: ConsumerTeardown) {
	if (teardown instanceof ConsumerNode) {
		teardown.dispose();
	}
	else {
		try {
			teardown();
		}
		catch (e) {
			console.error(e);
		}
	}
}

export interface ConsumerOptions {
	debugFlag?: unknown;
}

export class ConsumerNode {
	/** 节点的层级，当他创建在其他 ConsumerNode 作用域中时，层级会+1 */
	public readonly level: number = 0;
	private parent?: ConsumerNode;
	
	private _cleanups?: Set<ConsumerTeardown>;
	
	public get cleanups(): Set<ConsumerTeardown> | undefined {
		return this._cleanups;
	}
	
	private _disposed = false;
	
	public get disposed(): boolean {
		return this._disposed;
	}
	
	constructor(public options?: ConsumerOptions) {
		const activeConsumer = getActiveConsumer();
		
		if (activeConsumer) {
			this.level = activeConsumer.level + 1;
			
			this.parent = activeConsumer;
			
			activeConsumer.addCleanup(this);
		}
	}
	
	public addCleanup(teardown: ConsumerTeardown) {
		if (this.disposed) {
			execTeardown(teardown);
			return;
		}
		
		if (!this._cleanups) {
			this._cleanups = new Set();
		}
		
		this._cleanups.add(teardown);
	}
	
	public removeCleanup(teardown: ConsumerTeardown) {
		if (this._cleanups) {
			this._cleanups.delete(teardown);
		}
	}
	
	public cleanup() {
		const { _cleanups } = this;
		if (_cleanups) {
			this._cleanups = undefined;
			
			for (const teardown of _cleanups) {
				execTeardown(teardown);
			}
		}
	}
	
	public dispose() {
		if (this.disposed) {
			return;
		}
		
		this._disposed = true;
		
		this.cleanup();
		
		this.parent?.removeCleanup(this);
		
		delete this.parent;
		
		try {
			this.onDispose();
		}
		catch (e) {
			console.error(e);
		}
		
	}
	
	protected onDispose(): void {
	}
}

/**
 * 注册一个清理方法，该方法在当前反应范围的清除或重新计算时执行。可以在任何组件或 Effect 中使用
 * https://www.solidjs.com/docs/latest/api#oncleanup
 * @param callback
 */
export function onCleanup(callback: () => void) {
	const activeConsumer = getActiveConsumer();
	
	if (!activeConsumer) {
		console.warn("cleanups created outside a reactive will never be run");
		return;
	}
	
	activeConsumer.addCleanup(callback);
	
}

/**
 * 在制定响应上下文中执行函数
 * */
export function tracked<Args extends readonly any[], R>(consumer: ConsumerNode | undefined,
														project: (...args: Args) => R,
														...args: Args): R {
	const prev = setActiveConsumer(consumer);
	
	try {
		return project(...args);
	}
	finally {
		setActiveConsumer(prev);
	}
}

/**
 * @see tracked
 * */
export function trackedApply<T, Args extends any[], R>(consumer: ConsumerNode | undefined,
													   project: (this: T, ...args: Args) => R,
													   thisArgs: T,
													   ...args: Args): R {
	const prev = setActiveConsumer(consumer);
	
	try {
		return project.apply(thisArgs, args);
	}
	finally {
		setActiveConsumer(prev);
	}
}

/**
 * 在非响应上下文中执行任意函数。执行的函数
 */
export function untracked<Args extends readonly any[], R>(project: (...args: Args) => R,
														  ...args: Args): R {
	return tracked(undefined, project, ...args);
}

/**
 * @see untracked
 * 调用this的方法，类似于bind(this)
 * @param project
 * @param thisArgs
 * @param args
 */
export function untrackedApply<T, A extends any[], R>(project: (this: T, ...args: A) => R, thisArgs: T, ...args: A): R {
	return trackedApply(undefined, project, thisArgs, ...args);
}

/**
 * 创建用于追踪响应上下文的对象
 * */
export function createRoot(options?: ConsumerOptions) {
	return new ConsumerNode(options);
}
