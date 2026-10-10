import { useEffect, useState } from 'react'
import { exportarDados, importarDados } from '../db'
import { carregarPrograma } from '../programa'
import { VERSAO, buscarAtualizacao } from '../atualizacao'
import { exportarAnalise } from '../analise'
import { fmtDescanso, hojeISO, preferencias } from '../util'
import { avisar } from '../toast'

const ATALHOS_DESCANSO = [60, 90, 120, 180]

export default function Ajustes() {
  const [descanso, setDescanso] = useState(String(preferencias.descanso))
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [versaoMsg, setVersaoMsg] = useState('')
  const [de, setDe] = useState(() => hojeISO(new Date(Date.now() - 6 * 86400000)))
  const [ate, setAte] = useState(() => hojeISO())

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistente)
  }, [])

  function baixar(json: string, arquivo: string) {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = arquivo
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function exportar() {
    baixar(await exportarDados(), `academia-backup-${new Date().toISOString().slice(0, 10)}.json`)
    avisar('Backup exportado.')
  }

  async function analise(destino: 'copiar' | 'baixar') {
    const json = await exportarAnalise(de, ate)
    if (!json) return avisar('Nenhum treino finalizado nesse período.')
    if (destino === 'baixar') {
      baixar(json, `academia-analise-${de}-a-${ate}.json`)
      return avisar('Arquivo de análise exportado.')
    }
    try {
      await navigator.clipboard.writeText(json)
      avisar('Copiado. É só colar na conversa com o avaliador.')
    } catch {
      avisar('Não deu para copiar. Use "Baixar arquivo".')
    }
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
        <h2>Análise da semana</h2>
        <p className="sub">Resumo enxuto dos treinos do período, para mandar ao avaliador.</p>
        <div className="grade2">
          <label className="campo">
            De
            <input type="date" value={de} max={ate} onChange={(e) => e.target.value && setDe(e.target.value)} />
          </label>
          <label className="campo">
            Até
            <input type="date" value={ate} min={de} max={hojeISO()} onChange={(e) => e.target.value && setAte(e.target.value)} />
          </label>
        </div>
        <div className="acoes">
          <button onClick={() => analise('copiar')}>Copiar</button>
          <button className="sec" onClick={() => analise('baixar')}>
            Baixar arquivo
          </button>
        </div>
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
