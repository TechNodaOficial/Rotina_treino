import { useEffect, useState } from 'react'

export interface Aviso {
  id: number
  texto: string
  acao?: { rotulo: string; fazer: () => void }
}

let ouvinte: ((a: Aviso) => void) | null = null
let seq = 0

/** Mostra uma mensagem curta na base da tela, com uma ação opcional (ex: "Desfazer"). */
export function avisar(texto: string, acao?: Aviso['acao']) {
  ouvinte?.({ id: ++seq, texto, acao })
}

export function useAviso() {
  const [aviso, setAviso] = useState<Aviso | null>(null)

  useEffect(() => {
    ouvinte = setAviso
    return () => {
      ouvinte = null
    }
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), aviso.acao ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [aviso])

  return [aviso, () => setAviso(null)] as const
}
