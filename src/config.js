// ============================================================================
// CONFIGURAÇÃO DO ENVIO DOS PALPITES
// ----------------------------------------------------------------------------
// A URL do fluxo do Power Automate NÃO fica no código (repositório público).
// Ela é lida da variável de ambiente VITE_ENDPOINT_PALPITES:
//   - Local: crie um arquivo .env.local na raiz com
//       VITE_ENDPOINT_PALPITES=https://...        (esse arquivo é ignorado pelo git)
//   - GitHub Pages (CI): definida como "Secret" do repositório (ver workflow).
// Se a variável estiver ausente, a página roda em MODO DEMONSTRAÇÃO.
// ============================================================================
export const ENDPOINT_PALPITES = (import.meta.env && import.meta.env.VITE_ENDPOINT_PALPITES) || ''

// Chave usada para salvar um rascunho local no navegador do colaborador.
export const STORAGE_KEY = 'balera-bolao-2026-mata-mata'
