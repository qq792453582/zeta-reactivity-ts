import { ComputationNode, ComputationOptions } from "./computation";
import { untracked } from "./consumer";
import { checkValueEquals, ValueEqualsFn } from "./equality";
import { producerAccessed, ProducerNode, producerNotifyConsumers, producerUpdateVersion } from "./producer";

export interface ComputedOptions<T> extends ComputationOptions {
	equalsFn?: ValueEqualsFn<T> | undefined;
}

/**
 * 从声明式反应式表达式中得出值的计算。
 * ComputedNode 既是反应性的生产者，也是反应性的消费者。
 */
export class ComputedNode<T> extends ComputationNode implements ProducerNode {
	
	public liveComputations?: Set<ComputationNode>;
	
	private computing = false;
	
	private value?: T;
	
	constructor(private computation: () => T,
				protected override options?: ComputedOptions<T>) {
		super(options);
	}
	
	public get(): T {
		if (this.disposed) {
			// 当计算节点被销毁后再调用，则直接返回computation的值，并不再具有响应式
			return untracked(this.computation);
		}
		
		this.update();
		
		producerAccessed(this);
		
		return this.value as T;
	}
	
	protected override onUpdate(): void {
		super.onUpdate();
		
		if (this.computing) {
			throw new Error("Detected cycle in computations.");
		}
		
		this.computing = true;
		
		try {
			const newValue = this.computation!();
			
			if (!checkValueEquals(newValue, this.value, this.options?.equalsFn)) {
				this.value = newValue;
				producerUpdateVersion(this);
			}
		}
		finally {
			this.computing = false;
		}
		
	}
	
	protected override onDirty(): void {
		super.onDirty();
		producerNotifyConsumers(this);
	}
	
	public recomputeValue(): void {
		this.update();
	}
	
	protected override onDispose() {
		super.onDispose();
		
		if (this.liveComputations) {
			const { liveComputations } = this;
			this.liveComputations = undefined;

			for (const consumer of liveComputations) {
				consumer.seenProducers?.delete(this);
			}
		}
		
		delete this.value;
	}
	
}

export type Computed<T> = (() => T) & { node: ComputedNode<T> }

/**
 * 创建一个计算信号，从表达式中导出一个反应值。
 * 当 computation 返回的值发生变化时，会触发依赖更新
 * computation 不会立即执行，会在在下一次访问时重新运行。
 */
export function createComputed<T>(computation: () => T, options?: ComputedOptions<T>): Computed<T> {
	const node = new ComputedNode(computation, options);
	
	return Object.assign(node.get.bind(node), { node });
}

