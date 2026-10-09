import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { buscarSessaoAtiva } from './db'
import Hoje from './pages/Hoje'
import Treinos from './pages/Treinos'
import TreinoEditor from './pages/TreinoEditor'
import TreinoVer from './pages/TreinoVer'
import SessaoAtiva from './pages/SessaoAtiva'
import Historico from './pages/Historico'
import SessaoDetalhe from './pages/SessaoDetalhe'
import Exercicios from './pages/Exercicios'
import ExercicioDetalhe from './pages/ExercicioDetalhe'
import Ajustes from './pages/Ajustes'
import Icone, { type NomeIcone } from './components/Icone'
import { useAviso } from './toast'

export type Tela =
  | { t: 'hoje' }
  | { t: 'treinos' }
  | { t: 'treino'; id?: number }
  | { t: 'treinoVer'; id: number }
  | { t: 'sessao'; id: number }
  | { t: 'historico' }
  | { t: 'sessaoDetalhe'; id: number }
  | { t: 'exercicios' }
  | { t: 'exercicio'; id: number }
  | { t: 'ajustes' }

export type Navegar = (tela: Tela, opts?: { substituir?: boolean }) => void

const ABAS: { t: Tela['t'] & NomeIcone; rotulo: string; grupo: Tela['t'][] }[] = [
  { t: 'hoje', rotulo: 'Hoje', grupo: ['hoje'] },
  { t: 'treinos', rotulo: 'Treinos', grupo: ['treinos', 'treino', 'treinoVer', 'sessao'] },
  { t: 'historico', rotulo: 'Histórico', grupo: ['historico', 'sessaoDetalhe'] },
  { t: 'exercicios', rotulo: 'Exercícios', grupo: ['exercicios', 'exercicio'] },
  { t: 'ajustes', rotulo: 'Ajustes', grupo: ['ajustes'] },
]

// Telas abertas a partir de outra: ganham um botão "Voltar" (no iPhone instalado não há botão do sistema).
const INTERNAS: Tela['t'][] = ['treino', 'treinoVer', 'sessaoDetalhe', 'exercicio']

export default function App() {
  const [tela, setTela] = useState<Tela>({ t: 'hoje' })
  const ativa = useLiveQuery(buscarSessaoAtiva)
  const retomou = useRef(false)
  const [aviso, fecharAviso] = useAviso()

  // Integra com o botão "voltar" do celular.
  const navegar: Navegar = (nova, opts) => {
    if (opts?.substituir) history.replaceState(nova, '')
    else history.pushState(nova, '')
    setTela(nova)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    history.replaceState({ t: 'hoje' }, '')
    const aoVoltar = (e: PopStateEvent) => setTela((e.state as Tela) ?? { t: 'hoje' })
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  // Ao abrir o app com um treino em andamento, volta direto para ele.
  useEffect(() => {
    if (ativa && !retomou.current) {
      retomou.current = true
      navegar({ t: 'sessao', id: ativa.id })
    }
  }, [ativa])

  return (
    <>
      <main key={tela.t}>
        {INTERNAS.includes(tela.t) && (
          <button className="voltar" onClick={() => history.back()}>
            <Icone nome="voltar" />
            Voltar
          </button>
        )}
        {ativa && !(tela.t === 'sessao' && tela.id === ativa.id) && (
          <button className="banner" onClick={() => navegar({ t: 'sessao', id: ativa.id })}>
            <span className="pulso" aria-hidden="true" />
            <span>
              Em andamento: <strong>{ativa.nome}</strong>
            </span>
            <span className="banner-acao">Continuar</span>
          </button>
        )}
        {tela.t === 'hoje' && <Hoje navegar={navegar} ativaId={ativa?.id} />}
        {tela.t === 'treinos' && <Treinos navegar={navegar} ativaId={ativa?.id} />}
        {tela.t === 'treino' && <TreinoEditor id={tela.id} />}
        {tela.t === 'treinoVer' && <TreinoVer id={tela.id} navegar={navegar} ativaId={ativa?.id} />}
        {tela.t === 'sessao' && <SessaoAtiva id={tela.id} navegar={navegar} />}
        {tela.t === 'historico' && <Historico navegar={navegar} />}
        {tela.t === 'sessaoDetalhe' && <SessaoDetalhe id={tela.id} navegar={navegar} />}
        {tela.t === 'exercicios' && <Exercicios navegar={navegar} />}
        {tela.t === 'exercicio' && <ExercicioDetalhe id={tela.id} />}
        {tela.t === 'ajustes' && <Ajustes />}
      </main>
      {aviso && (
        <div className="aviso-toast" role="status" key={aviso.id}>
          <span>{aviso.texto}</span>
          {aviso.acao && (
            <button
              className="link"
              onClick={() => {
                aviso.acao!.fazer()
                fecharAviso()
              }}
            >
              {aviso.acao.rotulo}
            </button>
          )}
        </div>
      )}
      <nav className="abas" aria-label="Navegação principal">
        {ABAS.map((a) => {
          const atual = a.grupo.includes(tela.t)
          return (
            <button
              key={a.t}
              className={atual ? 'ativa' : ''}
              aria-current={atual ? 'page' : undefined}
              onClick={() => navegar({ t: a.t } as Tela)}
            >
              <Icone nome={a.t} tamanho={22} />
              {a.rotulo}
            </button>
          )
        })}
      </nav>
    </>
  )
}
