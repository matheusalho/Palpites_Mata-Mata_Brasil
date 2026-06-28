# Bolão Balera 2026 — Palpites · Mata-Mata

Página de palpites da fase de Mata-Mata, reconstruída em **React + Vite** a partir da página da fase de grupos (`bolao.balera.com.br`) e adaptada às novas regras.

## Como rodar / publicar

```bash
npm install
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
npm run build    # gera /dist (arquivos estáticos para hospedar)
npm run preview  # pré-visualiza o build de produção
```

O resultado de `npm run build` (pasta `dist/`) é estático e pode ser hospedado onde a página atual está (Azure Static Web Apps, etc.).

## Configuração do envio (Power Automate)

Edite `src/config.js`:

```js
export const ENDPOINT_PALPITES = '' // cole aqui a URL do gatilho HTTP do fluxo
```

- **Vazio** → a página roda em **modo demonstração**: valida e imprime no console o JSON que seria enviado (nada é gravado).
- **Preenchido** → ao enviar, faz `POST` (JSON) para o fluxo do Power Automate, que grava na planilha do SharePoint. Resposta `409` = CPF já enviou.

### Contrato enviado (corpo do POST)

```jsonc
{
  "player": "Nome do colaborador",
  "cpf": "12345678901",
  "fase": "Rodada de 32",
  "predictions": [
    {
      "matchId": 76, "fase": "Rodada de 32",
      "mandante": "Brasil", "visitante": "Japão",
      "homeScore": 3, "awayScore": 1,
      "homeScorers": ["Vinícius Júnior", "Rodrygo", "Raphinha"],
      "awayScorers": ["Kaoru Mitoma"]
    }
    // ... um item por jogo
  ]
}
```

`homeScorers`/`awayScorers` têm tamanho igual ao placar daquele time, na ordem dos gols. `(gol contra)` é uma opção válida.

## Adaptações em relação à fase de grupos

- Jogos do **mata-mata** (não mais 72 jogos de grupos) — vindos de `src/dados/chaveamento.json`.
- **Listas suspensas dinâmicas de artilheiros**: ao informar o placar, surgem N seletores com os jogadores do time da casa e M do visitante (jogadores em `src/dados/elencos.json`).
- **Brasil**: preencher os artilheiros do Brasil é obrigatório; demais times é opcional.
- Removidos os palpites bônus (campeão / artilheiro geral / time com mais gols).

## Dados (fonte da verdade)

- `src/dados/chaveamento.json` — jogos do mata-mata. **Edite aqui** quando os confrontos provisórios (Grupos J/K/L e 3ºs colocados) forem confirmados ou quando avançarem as fases (Oitavas, Quartas...).
- `src/dados/elencos.json` — elencos das seleções (nome/posição/clube).

(Cópias mestras em `C:\Projetos\Bolao_Balera_2026\dados_mata-mata\`.)

## Referência

`referencia_original/` contém a réplica baixada da página da fase de grupos (HTML + assets), usada como base visual e de comportamento.
