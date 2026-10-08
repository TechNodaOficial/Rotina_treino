import { useEffect, useState } from 'react'
import { exportarDados, importarDados } from '../db'
import { carregarPrograma } from '../programa'
import { VERSAO, buscarAtualizacao } from '../atualizacao'
import { fmtNum, metaAgua, preferencias } from '../util'

export default function Ajustes() {
  const [descanso, setDescanso] = useState(String(preferencias.descanso))
  const [peso, setPeso] = useState(String(preferencias.peso))
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [msg, setMsg] = useState('')
  const [versaoMsg, setVersaoMsg] = useState('')

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
        <label className="campo">
          Seu peso (kg), usado na meta de água
          <input
            inputMode="decimal"
            value={peso}
            onChange={(e) => {
              setPeso(e.target.value)
              const n = Number(e.target.value.replace(',', '.'))
              if (n > 0) preferencias.peso = n
            }}
          />
        </label>
        <p className="sub">
          Meta de água: {fmtNum(metaAgua(preferencias.peso, true) / 1000)} L em dia de treino, {fmtNum(metaAgua(preferencias.peso, false) / 1000)} L
          no descanso (~35 ml/kg + reposição do treino).
        </p>
      </article>

      <article className="card">
        <h2>Programa de hipertrofia</h2>
        <p className="sub">Adiciona os 5 treinos do programa sem apagar nada. Treinos com o mesmo nome são ignorados.</p>
        <button
          className="largo"
          onClick={async () => {
            const n = await carregarPrograma()
            setMsg(n ? `${n} treinos adicionados.` : 'O programa já está carregado.')
          }}
        >
          Carregar programa
        </button>
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

      <article className="card">
        <h2>Versão {VERSAO}</h2>
        <p className="sub">{versaoMsg || 'O app procura atualizações sozinho sempre que você abre.'}</p>
        <button
          className="sec largo"
          onClick={async () => {
            setVersaoMsg('Procurando…')
            try {
              setVersaoMsg((await buscarAtualizacao()) ? 'Atualizando…' : 'Você já está na versão mais recente.')
            } catch {
              setVersaoMsg('Sem conexão para verificar agora.')
            }
          }}
        >
          Buscar atualização
        </button>
      </article>
    </section>
  )
}
