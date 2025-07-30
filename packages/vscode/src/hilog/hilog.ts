import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

import 'uno.css'

const app = createApp(App).use(createPinia())
app.mount('#app')
