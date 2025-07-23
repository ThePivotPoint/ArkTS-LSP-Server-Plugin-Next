<!-- This file is test the compatibility with vue official. -->
<script setup lang="tsx">
import { ref } from 'vue';

/** Message jsoc @jsoc tsdoc */
const message = ref('Hello, Vue 3 with TypeScript!');

defineProps<{
  a: string
}>()
</script>

<template>
  <div>
    {{ message }}
  </div>
</template>