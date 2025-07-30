<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionStore } from './composables/connection'

const connectionStore = useConnectionStore()
const text = ref('')
async function sendMessage(): Promise<void> {
  try {
    const response = await connectionStore.connection.sendRequest({
      method: 'hilog',
      params: [1],
      id: 1,
    })
    text.value = `${text.value}\n${JSON.stringify(response)}`
  }
  catch (error) {
    text.value = `${text.value}\n${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`
  }
}
</script>

<template>
  <div :style="{ width: `100%`, height: `100%`, display: 'flex', flexDirection: 'column' }">
    <div>
      <button @click="sendMessage">
        发送消息！！
      </button>
      <span>{{ text }}</span>
      <span>{{ connectionStore.event }}</span>
    </div>
  </div>
</template>

<style>
select {
  border: 1px solid var(--vscode-editorHoverWidget-border);
  background-color: var(--vscode-editorHoverWidget-background);
  color: var(--vscode-editorHoverWidget-foreground);
  text-align: left;
  padding-right: 10px;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-left: 2px;
  border-radius: 4px;
}

select option {
  color: var(--vscode-editorHoverWidget-foreground);
  text-align: left;
}
</style>
