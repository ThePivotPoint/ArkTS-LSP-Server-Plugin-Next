import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/vscode.ts'],
  outDir: './out',
  format: ['cjs', 'esm'],
  sourcemap: true,
  dts: true,
  clean: true,
  external: ['vscode'],
})
