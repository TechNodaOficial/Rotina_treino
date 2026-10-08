import { useEffect, useState } from 'react'
import { exportarDados, importarDados } from '../db'
import { preferencias } from '../util'

export default function Ajustes() {
  const [descanso, setDescanso] = useState(String(preferencias.descanso))
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistente)
  }, [])

  async function exportar() {
    const blob = new Blob([await exportarDados()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `academia-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup exportado.')
  }

  async function importar(arquivo?: File) {
    if (!arquivo) return
    if (!confirm('Importar vai SUBSTITUIR todos os dados atuais por este backup. Continuar?')) return
    try {
      await importarDados(await arquivo.text())
      setMsg('Backup importado com sucesso.')
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`)
    }
  }

  return (
    <section>
      <header className="topo">
        <h1>Ajustes</h1>
      </header>

      <article className="card">
        <label className="campo">
          Descanso entre séries (segundos)
          <input
            inputMode="numeric"
            value={descanso}
            onChange={(e) => {
              setDescanso(e.target.value)
              const n = Number(e.target.value)
              if (n > 0) preferencias.descanso = n
            }}
          />
        </label>
      </article>

      <article className="card">
        <h2>Backup</h2>
        <p className="sub">
          Seus dados ficam só neste celular. Exporte de vez em quando e guarde o arquivo no Drive ou no PC.
        </p>
        <div className="acoes">
          <button onClick={exportar}>Exportar</button>
          <label className="botao sec">
            Importar
            <input type="file" accept="application/json,.json" hidden onChange={(e) => importar(e.target.files?.[0])} />
          </label>
        </div>
        {msg && <p className="sub">{msg}</p>}
        {persistente === false && (
          <p className="sub aviso">
            O navegador ainda não marcou o armazenamento como persistente. Instalar o app na tela inicial costuma resolver.
          </p>
        )}
      </article>
    </section>
  )
}
