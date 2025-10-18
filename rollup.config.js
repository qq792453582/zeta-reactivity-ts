import { defineConfig } from "rollup";
import pkg from "./package.json" with { type: "json" };
import typescript from "rollup-plugin-typescript2";
import { dts } from "rollup-plugin-dts";

export default defineConfig([
	{
		input: "./src/index.ts",
		output: {
			format: "esm",
			file: "./dist/reactive.mjs",
		},
		plugins: [
			typescript(),
		],
		external: Object.keys(pkg.dependencies || {}),
	},
	{
		input: "./src/index.ts",
		output: {
			file: "./dist/reactive.mjs.d.ts",
			format: "esm"
		},
		plugins: [
			dts()
		],
		onwarn(warning, defaultOnWarnHandler) {
			if (warning.code === "CIRCULAR_DEPENDENCY"
				|| warning.code === "UNKNOWN_OPTION") {
				return;
			}
			
			defaultOnWarnHandler(warning);
		}
		
	}
]);
