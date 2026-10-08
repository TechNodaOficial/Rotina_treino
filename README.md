# Academia

PWA pessoal para registrar treinos: exercícios, séries, repetições e cargas.
Os dados ficam no próprio celular (IndexedDB via Dexie) e funcionam offline.

## Rodar

```bash
npm install
npm run dev      # abre também na rede local (--host)
npm run build    # gera dist/ pronto para hospedar
```

## Usar no celular

O service worker (offline + "instalar app") exige HTTPS. Hospede o `dist/`
em qualquer host estático (GitHub Pages, Vercel, Netlify) e, no celular,
abra o link e use "Adicionar à tela inicial".

Os dados ficam no navegador do celular, presos àquele endereço. Use
**Ajustes → Exportar** de vez em quando para ter um backup em JSON.

## Estrutura

- `src/db.ts` — schema Dexie (exercicios, treinos, sessoes, series) e helpers
- `src/pages/` — telas (treinos, treino em andamento, histórico, exercícios, ajustes)
- `src/components/` — seletor de exercício e gráfico SVG de evolução
