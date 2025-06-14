<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const options = ref([1, 2, 3])
const selected = ref('测试选项')
</script>

<template>
  <div :style="{ width: `100%`, height: `100%`, display: 'flex', flexDirection: 'column' }">
    <div>
      <select v-model="selected">
        <option value="测试选项">
          测试选项
        </option>
        <option value="测试选项2">
          测试选项2
        </option>
        <option value="测试选项3">
          测试选项3
        </option>
      </select>
      {{ count }}
      {{ options }}
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
