import typescript from "@rollup/plugin-typescript";
// import dts from "rollup-plugin-dts";
import json from "@rollup/plugin-json";
// import { nodeResolve } from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';

const config = [
    {
        input: "src/index.ts",
        output: [
            { file: "bin/commander.js", sourcemap: true, format: "es" }
        ],
        plugins: [
            typescript({
                tsconfig: './tsconfig.json'
            }),
            json(),
            // nodeResolve(),
            // commonjs()
        ],
        external: ['sharp']
    },
    /* {
        input: "src/index.ts",
        output: [{ file: "bin/index.d.ts", format: "es" }],
        plugins: [dts()]
    } */
]

export default config;