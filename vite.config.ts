import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'sw',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'No Excuses',
        short_name: 'No Excuses',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        // Tela de abertura e barra de status no fundo claro do app (o ícone verde se destaca sobre ele).
        background_color: '#F2F4F7',
        theme_color: '#F2F4F7',
        icons: [
          // Uma entrada por finalidade (o Chrome desaconselha 'any maskable' junto); o ícone já respeita a zona segura.
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
