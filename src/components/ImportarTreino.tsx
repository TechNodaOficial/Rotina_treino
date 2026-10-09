import { useState } from 'react'
import { lerTreinos, salvarTreinos, treinosExistentes } from '../importacao'
import { avisar } from '../toast'

/** Cola um treino em JSON (ex: sugerido pelo avaliador) e salva no app. */
export default function ImportarTreino() {
  const [colado, setColado] = useState('')
  const [erro, setErro] = useState('')
  // Treinos lidos que já existem no app: espera o usuário escolher entre substituir ou salvar cópia.
  const [pendente, setPendente] = useState<{ treinos: ReturnType<typeof lerTreinos>; repetidos: string[] } | null>(null)

  async function importar() {
    setErro('')
    try {
      const treinos = lerTreinos(colado)
      const repetidos = await treinosExistentes(treinos)
      if (repetidos.length) setPendente({ treinos, repetidos })
      else await salvar(treinos, false)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function salvar(treinos: ReturnType<typeof lerTreinos>, substituir: boolean) {
    const { criados, atualizados } = await salvarTreinos(treinos, substituir)
    avisar(
      [atualizados && `${atualizados} atualizado(s)`, criados && `${criados} criado(s)`].filter(Boolean).join(', ') +
        ': ' +
        treinos.map((t) => t.nome).join(', '),
    )
    setPendente(null)
    setColado('')
  }

  return (
    <details className="card guia">
      <summary>Importar treino</summary>
      <p className="sub">Cole aqui o bloco JSON que o avaliador (Claude) gerou.</p>
      <textarea
        className="colar"
        aria-label="JSON do treino"
        aria-invalid={!!erro}
        value={colado}
        onChange={(e) => {
          setColado(e.target.value)
          setErro('')
          setPendente(null)
        }}
        placeholder='{ "nome": "...", "dias": [5], "itens": [ ... ] }'
        rows={6}
        spellCheck={false}
      />
      {erro && (
        <p className="erro" role="alert">
          Não deu para ler o JSON: {erro}. Confira se colou o bloco inteiro, do primeiro {'{'} ao último {'}'}.
        </p>
      )}
      {pendente ? (
        <div className="decisao" role="group" aria-label="Treino já existe">
          <p>
            Já existe <strong>{pendente.repetidos.join(', ')}</strong>. O que fazer?
          </p>
          <div className="acoes">
            <button onClick={() => salvar(pendente.treinos, true)}>Substituir</button>
            <button className="sec" onClick={() => salvar(pendente.treinos, false)}>
              Salvar cópia
            </button>
          </div>
          <button className="link" onClick={() => setPendente(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className="largo" onClick={importar} disabled={!colado.trim()}>
          Importar
        </button>
      )}
    </details>
  )
}
