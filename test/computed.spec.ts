import { expect, test } from "vitest";
import { createComputed, createRoot, createSignal, tracked } from "../src";

test("nested computed", () => {
	const signal = createSignal(0);
	
	tracked(createRoot(), () => {
		const computed1 = createComputed(() => signal() * 2);
		const computed2 = createComputed(() => computed1() * 2);
		
		expect(computed2()).toBe(0);
		
		signal.set(1);
		expect(computed2()).toBe(4);
	});
	
});
