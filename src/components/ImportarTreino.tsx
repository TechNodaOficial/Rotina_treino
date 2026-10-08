import { useState } from 'react'
import { lerTreinos, salvarTreinos, treinosExistentes } from '../importacao'

/** Cola um treino em JSON (ex: sugerido pelo avaliador) e salva no app. */
export default function ImportarTreino() {
  const [colado, setColado] = useState('')
  const [msg, setMsg] = useState('')

  async function importar() {
    try {
      const treinos = lerTreinos(colado)
      const repetidos = await treinosExistentes(treinos)
      const substituir =
        repetidos.length > 0 &&
        confirm(`Já existe: ${repetidos.join(', ')}.\n\nOK = substituir pelo novo\nCancelar = salvar como cópia`)
      const { criados, atualizados } = await salvarTreinos(treinos, substituir)
      setMsg(
        [atualizados && `${atualizados} atualizado(s)`, criados && `${criados} criado(s)`].filter(Boolean).join(', ') +
          ': ' +
          treinos.map((t) => t.nome).join(', '),
      )
      setColado('')
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`)
    }
  }

  return (
    <details className="card guia">
      <summary>Importar treino</summary>
      <p className="sub">Cole aqui o bloco JSON que o avaliador (Claude) gerou.</p>
      <textarea
        className="colar"
        value={colado}
        onChange={(e) => setColado(e.target.value)}
        placeholder='{ "nome": "...", "dias": [5], "itens": [ ... ] }'
        rows={6}
        spellCheck={false}
      />
      <button className="largo" onClick={importar} disabled={!colado.trim()}>
        Importar
      </button>
      {msg && <p className="sub">{msg}</p>}
    </details>
  )
}
