import { createConnection } from '@arkts/headless-jsonrpc'
import { createVSCodeBrowserWindowAdapter } from '@arkts/headless-jsonrpc/adapter-vscode-browser-window'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConnectionStore = defineStore('hilog/connection', () => {
  const adapter = createVSCodeBrowserWindowAdapter()
  const event = ref('')
  const connection = createConnection({
    adapter,
  })
  window.addEventListener('message', (event) => {
    console.warn('Received HiLog event (Webview side): ', event.data)
  })
  connection.onResponse((response) => {
    console.warn('Received HiLog response:', JSON.stringify(response, null, 2))
  })
  connection.listen()

  return {
    connection,
    event,
  }
})
