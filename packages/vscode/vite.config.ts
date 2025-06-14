import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import unoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx(), unoCSS()],

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
})
