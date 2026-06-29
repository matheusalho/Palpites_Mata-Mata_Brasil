import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build estático (igual ao site original). O resultado fica em /dist e pode ser
// hospedado em qualquer servidor de arquivos estáticos (Azure Static Web Apps, etc.).
export default defineConfig({
  // base configurável: Render (raiz do subdomínio) usa '/' (padrão);
  // GitHub Pages usa VITE_BASE=/Palpites_Mata-Mata_Brasil/ no build.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
})
