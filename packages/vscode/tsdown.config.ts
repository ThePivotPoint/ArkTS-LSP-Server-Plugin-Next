import { createRequire } from 'node:module'
import process from 'node:process'
import { defineConfig } from 'tsdown'

const require = createRequire(import.meta.url)
const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  entry: {
    client: './src/extension.ts',
    server: '../language-server/src/index.ts',
  },
  format: 'cjs',
  sourcemap: isDev,
  minify: isDev,
  define: { 'process.env.NODE_ENV': '"production"' },
  external: ['vscode'],
  tsconfig: './tsconfig.json',
  platform: 'node',
  plugins: [
    {
      name: 'umd2esm',
      resolveId: {
        filter: {
          id: /^(vscode-.*-languageservice|vscode-languageserver-types|jsonc-parser)$/,
        },
        handler(path, importer) {
          const pathUmdMay = require.resolve(path, { paths: [importer!] })
          // Call twice the replace is to solve the problem of the path in Windows
          let pathEsm = pathUmdMay
            .replace('/umd/', '/esm/')
            .replace('\\umd\\', '\\esm\\')

          if (pathEsm.includes('vscode-uri')) {
            pathEsm = pathEsm
              .replace('/esm/index.js', '/esm/index.mjs')
              .replace('\\esm\\index.js', '\\esm\\index.mjs')
          }

          return { id: pathEsm }
        },
      },
    },
  ],
})
