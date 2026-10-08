import { registerSW } from 'virtual:pwa-register'

declare const __VERSAO__: string
export const VERSAO = __VERSAO__

let registro: ServiceWorkerRegistration | undefined

// Com registerType "autoUpdate", a página recarrega sozinha assim que uma versão nova é instalada.
// Aqui só garantimos que o app procure atualização ao abrir e sempre que voltar para a tela.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    registro = reg
    if (!reg) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {})
    })
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000)
  },
})

/** Procura uma versão nova. Se houver, o app recarrega sozinho. */
export async function buscarAtualizacao(): Promise<boolean> {
  if (!registro) return false
  await registro.update()
  return !!(registro.installing || registro.waiting)
}
