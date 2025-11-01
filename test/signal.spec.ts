import { describe, expect, test } from "vitest";
import { createComputed, createRoot, createSignal, createWatch, flushWatches, setValueEqualsFn, tracked } from "../src";

describe("signals", () => {
	test("should get and set value", () => {
		const signal = createSignal(1);
		
		expect(signal()).toBe(1);
		
		signal.set(2);
		
		expect(signal()).toBe(2);
		
		signal.value++;
		
		expect(signal()).toBe(3);
		
	});
	
	test("should update value", () => {
		const signal = createSignal([1]);
		
		signal.update(value => value.push(2));
		
		expect(signal()).toEqual([1, 2]);
	});
	
	test("should signal accessed", () => {
		tracked(createRoot(), () => {
			const signal = createSignal(1);
			
			let value: number | undefined;
			
			const watch = createWatch(() => {
				value = signal();
			});
			
			expect(value).toBe(1);
			
			const watchNode = watch.node;
			const signalNode = signal.node;
			
			expect(watchNode.seenProducers?.has(signalNode)).toBe(true);
			expect(signalNode.liveComputations?.has(watchNode)).toBe(true);
			
			expect(watchNode.seenProducers?.size).toBe(1);
			expect(signalNode.liveComputations?.size).toBe(1);
		});
	});
	
	test("should signal notify watch", () => {
		tracked(createRoot(), () => {
			const signal = createSignal(1);
			
			const watch = createWatch(() => {
				signal();
			});
			
			flushWatches();
			
			const watchNode = watch.node;
			expect(watchNode.dirty).toBe(false);
			
			signal.set(1);
			
			expect(watchNode.dirty).toBe(false);
			
			signal.set(2);
			
			expect(watchNode.dirty).toBe(true);
		});
	});
	
	test("should not update signal when new value is equal to the previous one with global custom equals function", () => {
		class TestValue {
			constructor(public value: number) {
			}
			
			public equals(other: TestValue) {
				return this.value === other.value;
			}
		}
		
		setValueEqualsFn((a, b) => {
			if (a instanceof TestValue && b instanceof TestValue) {
				return a.equals(b);
			}
			
			return false;
		});
		
		const value = new TestValue(1);
		const signal = createSignal(value);
		
		expect(signal()).toBe(value);
		
		signal.set(new TestValue(1));
		
		expect(signal()).toBe(value);
		
		const newValue = new TestValue(2);
		signal.set(newValue);
		
		expect(signal()).toBe(newValue);
	});
	
	test("should not update signal when new value is equal to the previous one with custom equals function", () => {
		const signal = createSignal("aaa", (a, b) => a.length === b.length);
		expect(signal()).toBe("aaa");
		
		signal.set("bbb");
		expect(signal()).toBe("aaa");
		
		signal.set("c");
		expect(signal()).toBe("c");
	});
	
	test("should signal update computed", () => {
		const signal = createSignal(0);
		
		tracked(createRoot(), () => {
			const computed = createComputed(() => `value: ${ signal() }`);
			
			expect(computed()).toBe("value: 0");
			
			signal.set(1);
			expect(computed.node.dirty).toBeTruthy();
			expect(computed()).toBe("value: 1");
			
			signal.set(1);
			expect(computed.node.dirty).toBeFalsy();
		});
		
	});
});
