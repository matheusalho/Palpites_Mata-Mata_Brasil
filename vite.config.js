import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build estático (igual ao site original). O resultado fica em /dist e pode ser
// hospedado em qualquer servidor de arquivos estáticos (Azure Static Web Apps, etc.).
export default defineConfig({
  // GitHub Pages de projeto serve em /<repo>/. Para hospedar em outro lugar
  // (domínio próprio, raiz), troque para '/'.
  base: '/Palpites_Mata-Mata_Brasil/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
})
