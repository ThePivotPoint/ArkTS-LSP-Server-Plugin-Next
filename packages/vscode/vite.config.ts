import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import { InternalTransformHtmlPlugin } from './scripts/compiled-html-plugin'

export default defineConfig(async () => {
  const unoCSS = await import('unocss/vite')

  return {
    plugins: [
      vue(),
      vueJsx(),
      unoCSS.default(),
      InternalTransformHtmlPlugin(),
    ],

    base: './',

    build: {
      outDir: 'build',
      assetsDir: '.',
      rollupOptions: {
        input: [
          'hilog.html',
        ],
      },
    },
  }
})
