import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  
  server: {
    port: 3000,
    allowedHosts : [".trycloudflare.com"],
    proxy: {
      '/api': {
        target: 'https://bunch-don-advocacy-macintosh.trycloudflare.com',
        changeOrigin: true,
        ws: true
      },
    },
  },
  
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
})

export default config
