import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, iniciarSessao, vigente } from '../db'
import type { Navegar } from '../App'
import { hojeISO } from '../util'

/** Formulário para registrar um treino que já foi feito em outro dia. */
export default function RegistrarPassado({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  const treinos = useLiveQuery(() => db.treinos.toArray()) ?? []
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  const [data, setData] = useState(hojeISO(ontem))
  const [escolhido, setEscolhido] = useState<string>('')

  const [a, m, d] = data.split('-').map(Number)
  const dia = new Date(a, m - 1, d)
  // Sugere o treino programado para o dia da semana escolhido.
  const sugerido = treinos.find((t) => t.dias?.includes(dia.getDay()) && vigente(t, data))
  const treinoId = escolhido || (sugerido ? String(sugerido.id) : 'livre')

  async function registrar() {
    const treino = treinoId === 'livre' ? undefined : treinos.find((t) => t.id === Number(treinoId))
    // 18h do dia escolhido (ou 1h atrás, se for hoje e ainda não deu 18h).
    const inicio = Math.min(new Date(a, m - 1, d, 18).getTime(), Date.now() - 60 * 60000)
    navegar({ t: 'sessao', id: await iniciarSessao(treino, inicio) })
  }

  return (
    <details className="card guia">
      <summary>Registrar treino que já fiz</summary>
      <p className="sub">Escolha o dia e o treino, depois anote as cargas normalmente.</p>
      <div className="grade2">
        <label className="campo">
          Dia
          <input type="date" value={data} max={hojeISO()} onChange={(e) => e.target.value && setData(e.target.value)} />
        </label>
        <label className="campo">
          Treino
          <select className="seletor" value={treinoId} onChange={(e) => setEscolhido(e.target.value)}>
            {treinos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
            <option value="livre">Treino livre</option>
          </select>
        </label>
      </div>
      <button className="largo" onClick={registrar} disabled={!!ativaId}>
        Registrar
      </button>
      {ativaId && <p className="sub centro">Finalize o treino em andamento antes.</p>}
    </details>
  )
}
