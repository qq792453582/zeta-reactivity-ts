import { describe, expect, test } from "vitest";
import { createRoot, createSignal, createWatch, flushWatches, tracked } from "../src";

describe("watch", function () {
	test("should watch create", () => {
		const root = createRoot();
		tracked(root, () => {
			const watch = createWatch(() => {
				const signal = createSignal(1);
				expect(signal()).toBe(1);
			});
			
			flushWatches();
			
			expect(watch.node.seenProducers?.size).toBe(1);
			expect(root.cleanups?.has(watch.node)).toBe(true);
			expect(root.cleanups?.size).toBe(1);
		});
	});
	
	test("should watch update", () => {
		tracked(createRoot(), () => {
			const signal = createSignal(1);
			let value!: number;
			const watch = createWatch(() => {
				value = signal();
			});
			
			flushWatches();
			
			expect(value).toBe(1);
			expect(watch.node.dirty).toBe(false);
			
			signal.set(2);
			expect(value).toBe(1);
			expect(watch.node.dirty).toBe(true);
			
			flushWatches();
			
			expect(value).toBe(2);
			expect(watch.node.dirty).toBe(false);
			
		});
		
	});
	
	test("should on watch set signal value", () => {
		tracked(createRoot(), () => {
			const signal = createSignal(1);
			let value: number | undefined;
			createWatch(() => {
				value = signal();
				
				signal.value++;
			});
			
			expect(value).toBe(1);
			
			flushWatches();
			expect(value).toBe(1);
			
		});
	});
	
	test("should defer watch", () => {
		tracked(createRoot(), () => {
			const signal = createSignal(1);
			let value: number | undefined;
			createWatch(() => {
				value = signal();
			}, { defer: true });
			
			expect(value).toBe(undefined);
			
			flushWatches();
			expect(value).toBe(1);
			
		});
	});
});
