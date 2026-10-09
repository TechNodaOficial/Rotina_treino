import { useEffect, useState } from 'react'
import { exportarDados, importarDados } from '../db'
import { carregarPrograma } from '../programa'
import { VERSAO, buscarAtualizacao } from '../atualizacao'
import { fmtDescanso, preferencias } from '../util'
import { avisar } from '../toast'

const ATALHOS_DESCANSO = [60, 90, 120, 180]

export default function Ajustes() {
  const [descanso, setDescanso] = useState(String(preferencias.descanso))
  const [persistente, setPersistente] = useState<boolean | null>(null)
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
    avisar('Backup exportado.')
  }

  async function importar(arquivo?: File) {
    if (!arquivo) return
    if (!confirm('Importar vai SUBSTITUIR todos os dados atuais por este backup. Continuar?')) return
    try {
      await importarDados(await arquivo.text())
      avisar('Backup importado com sucesso.')
    } catch (e) {
      avisar(`Não deu para importar: ${(e as Error).message}. Seus dados não foram alterados.`)
    }
  }

  return (
    <section>
      <header className="topo">
        <h1>Ajustes</h1>
      </header>

      <article className="card">
        <h2>Descanso padrão</h2>
        <p className="sub">Usado nos exercícios que não definem o próprio tempo de descanso.</p>
        <div className="atalhos">
          {ATALHOS_DESCANSO.map((s) => (
            <button
              key={s}
              className={Number(descanso) === s ? '' : 'sec'}
              aria-pressed={Number(descanso) === s}
              onClick={() => {
                setDescanso(String(s))
                preferencias.descanso = s
              }}
            >
              {fmtDescanso(s)}
            </button>
          ))}
        </div>
        <label className="campo">
          Outro valor (segundos)
          <input
            inputMode="numeric"
            value={descanso}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              setDescanso(v)
              if (Number(v) > 0) preferencias.descanso = Number(v)
            }}
          />
        </label>
      </article>

      <article className="card">
        <h2>Programa de hipertrofia</h2>
        <p className="sub">Adiciona os 5 treinos do programa sem apagar nada. Treinos com o mesmo nome são ignorados.</p>
        <button
          className="largo"
          onClick={async () => {
            const n = await carregarPrograma()
            avisar(n ? `${n} treinos adicionados.` : 'O programa já está carregado.')
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
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                importar(e.target.files?.[0])
                e.target.value = '' // permite escolher o mesmo arquivo de novo
              }}
            />
          </label>
        </div>
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
