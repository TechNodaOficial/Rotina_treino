import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  define: {
    // SHA do commit no GitHub Actions; "local" no PC.
    __VERSAO__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Academia — Registro de Treinos',
        short_name: 'Academia',
        description: 'Registro pessoal de treinos, séries e cargas',
        lang: 'pt-BR',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
})
