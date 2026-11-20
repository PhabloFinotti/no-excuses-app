import { createApp } from 'vue'
import '@fontsource-variable/nunito/wght.css'
import './style.css'
import App from './App.vue'

// A fonte chega depois do primeiro desenho e reflui o texto. Espera até 1 s por ela
// (vem do cache local na maioria das vezes); passado o limite, monta com a fonte reserva mesmo assim.
const font = document.fonts?.load("800 1em 'Nunito Variable'", 'Hoje 0123456789 áçãé') ?? Promise.resolve()
await Promise.race([font, new Promise((r) => setTimeout(r, 1000))]).catch(() => {})

createApp(App).mount('#app')
