import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { agrupar } from '../util'

interface Props {
  onEscolher: (exercicioId: number) => void
  ocultar?: number[]
  rotulo?: string
}

export default function SeletorExercicio({ onEscolher, ocultar = [], rotulo = '+ Adicionar exercício' }: Props) {
  const exercicios = useLiveQuery(() => db.exercicios.orderBy('nome').toArray()) ?? []
  const grupos = agrupar(
    exercicios.filter((e) => !ocultar.includes(e.id)),
    (e) => e.grupo,
  )

  return (
    <select
      className="seletor"
      value=""
      onChange={(e) => e.target.value && onEscolher(Number(e.target.value))}
    >
      <option value="">{rotulo}</option>
      {[...grupos.keys()].sort().map((g) => (
        <optgroup key={g} label={g}>
          {grupos.get(g)!.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
