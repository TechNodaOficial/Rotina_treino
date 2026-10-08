import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { buscarSessaoAtiva } from './db'
import Treinos from './pages/Treinos'
import TreinoEditor from './pages/TreinoEditor'
import SessaoAtiva from './pages/SessaoAtiva'
import Historico from './pages/Historico'
import SessaoDetalhe from './pages/SessaoDetalhe'
import Exercicios from './pages/Exercicios'
import ExercicioDetalhe from './pages/ExercicioDetalhe'
import Ajustes from './pages/Ajustes'

export type Tela =
  | { t: 'treinos' }
  | { t: 'treino'; id?: number }
  | { t: 'sessao'; id: number }
  | { t: 'historico' }
  | { t: 'sessaoDetalhe'; id: number }
  | { t: 'exercicios' }
  | { t: 'exercicio'; id: number }
  | { t: 'ajustes' }

export type Navegar = (tela: Tela, opts?: { substituir?: boolean }) => void

const ABAS: { t: Tela['t']; rotulo: string; grupo: Tela['t'][] }[] = [
  { t: 'treinos', rotulo: 'Treinos', grupo: ['treinos', 'treino', 'sessao'] },
  { t: 'historico', rotulo: 'Histórico', grupo: ['historico', 'sessaoDetalhe'] },
  { t: 'exercicios', rotulo: 'Exercícios', grupo: ['exercicios', 'exercicio'] },
  { t: 'ajustes', rotulo: 'Ajustes', grupo: ['ajustes'] },
]

export default function App() {
  const [tela, setTela] = useState<Tela>({ t: 'treinos' })
  const ativa = useLiveQuery(buscarSessaoAtiva)
  const retomou = useRef(false)

  // Integra com o botão "voltar" do celular.
  const navegar: Navegar = (nova, opts) => {
    if (opts?.substituir) history.replaceState(nova, '')
    else history.pushState(nova, '')
    setTela(nova)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    history.replaceState({ t: 'treinos' }, '')
    const aoVoltar = (e: PopStateEvent) => setTela((e.state as Tela) ?? { t: 'treinos' })
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
      <main>
        {ativa && !(tela.t === 'sessao' && tela.id === ativa.id) && (
          <button className="banner" onClick={() => navegar({ t: 'sessao', id: ativa.id })}>
            Treino em andamento: <strong>{ativa.nome}</strong> — continuar
          </button>
        )}
        {tela.t === 'treinos' && <Treinos navegar={navegar} ativaId={ativa?.id} />}
        {tela.t === 'treino' && <TreinoEditor id={tela.id} />}
        {tela.t === 'sessao' && <SessaoAtiva id={tela.id} navegar={navegar} />}
        {tela.t === 'historico' && <Historico navegar={navegar} />}
        {tela.t === 'sessaoDetalhe' && <SessaoDetalhe id={tela.id} navegar={navegar} />}
        {tela.t === 'exercicios' && <Exercicios navegar={navegar} />}
        {tela.t === 'exercicio' && <ExercicioDetalhe id={tela.id} />}
        {tela.t === 'ajustes' && <Ajustes />}
      </main>
      <nav className="abas">
        {ABAS.map((a) => (
          <button
            key={a.t}
            className={a.grupo.includes(tela.t) ? 'ativa' : ''}
            onClick={() => navegar({ t: a.t } as Tela)}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>
    </>
  )
}
