import { getActiveConsumer } from "./activeConsumer";
import { ConsumerNode, ConsumerOptions, tracked, trackedApply } from "./consumer";
import { ProducerNode } from "./producer";

export interface ComputationOptions extends ConsumerOptions {
	isThrottleUpdate?: () => boolean;
	onDirty?: () => void;
	onAccessed?: (producer: ProducerNode) => void;
	onPreUpdate?: () => void;
}

export class ComputationNode extends ConsumerNode {
	public seenProducers?: Map<ProducerNode, number>;
	private hasRun = false;
	
	private _dirty = true;
	
	public get dirty(): boolean {
		return this._dirty;
	}
	
	constructor(public override options?: ComputationOptions) {
		super(options);
		
		console.assert(!!getActiveConsumer(), "computation created outside a reactive context will never be disposed");
	}
	
	public markDirty(): void {
		if (this.dirty
			|| this.disposed) {
			return;
		}
		
		this._dirty = true;
		
		this.onDirty();
	}
	
	public forceMarkDirty() {
		if ((this.dirty && !this.hasRun)
			|| this.disposed) {
			return;
		}
		
		this._dirty = true;
		this.hasRun = false;
		
		this.onDirty();
	}
	
	protected onDirty() {
		this.options?.onDirty?.();
	}
	
	private pollProducersForChange(): boolean {
		if (!this.seenProducers) {
			return false;
		}
		
		for (const [producer, seenVersion] of this.seenProducers) {
			
			producer.recomputeValue?.();
			
			const producerVersion = producer.version || 0;
			
			if (producerVersion !== seenVersion) {
				return true;
			}
		}
		
		return false;
	}
	
	public update(): void {
		if (!this._dirty
			|| this.disposed) {
			return;
		}
		
		this.options?.onPreUpdate?.();
		
		if (this.hasRun
			&& !this.pollProducersForChange()) {
			this._dirty = false;
			return;
		}
		
		this.hasRun = true;
		
		this.cleanSeenProducers();
		
		if (this.options?.isThrottleUpdate) {
			if (tracked(this, this.options.isThrottleUpdate)) {
				this._dirty = false;
				return;
			}
		}
		
		this.run();
	}
	
	public run(): void {
		if (this.disposed) {
			return;
		}
		
		this.cleanup();
		
		trackedApply(this, this.onUpdate, this);
		
		this._dirty = false;
		
	}
	
	protected onUpdate() {
		
	}
	
	private cleanSeenProducers() {
		if (this.seenProducers) {
			for (const [producer] of this.seenProducers) {
				if (producer.liveComputations) {
					producer.liveComputations.delete(this);
				}
			}
		}
	}
	
	protected override onDispose(): void {
		super.onDispose();
		
		this.cleanSeenProducers();
		this.seenProducers = undefined;
	}
	
	public OnAccessed(producer: ProducerNode) {
		this.options?.onAccessed?.(producer);
		
		if (!producer.liveComputations) {
			producer.liveComputations = new Set();
		}
		
		producer.liveComputations.add(this);
		
		this.seenProducers = new Map();
		this.seenProducers.set(producer, producer.version ?? 0);
	}
	
}

export function markedComputationDirty(computation: ComputationNode) {
	computation.markDirty();
}
