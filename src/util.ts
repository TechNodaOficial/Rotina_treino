import type { Serie } from './db'

export const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
export const fmtPeso = (n: number) => `${fmtNum(n)} kg`

export const fmtData = (t: number) =>
  new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

export function fmtDuracao(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

export const fmtSerie = (s: Pick<Serie, 'peso' | 'reps'>) => `${fmtNum(s.peso)}×${s.reps}`

/** Aceita vírgula ou ponto como separador decimal. */
export function lerNumero(txt: string): number | null {
  const n = Number(txt.replace(',', '.').trim())
  return txt.trim() !== '' && Number.isFinite(n) ? n : null
}

/** 1RM estimado (Epley). */
export const umRM = (s: Pick<Serie, 'peso' | 'reps'>) => (s.reps === 1 ? s.peso : s.peso * (1 + s.reps / 30))

export const volume = (series: Serie[]) => series.reduce((t, s) => t + s.peso * s.reps, 0)

export function agrupar<T, K>(itens: T[], chave: (i: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const i of itens) {
    const k = chave(i)
    m.set(k, [...(m.get(k) ?? []), i])
  }
  return m
}

export const preferencias = {
  get descanso(): number {
    try {
      return Number(localStorage.getItem('descanso')) || 90
    } catch {
      return 90
    }
  },
  set descanso(seg: number) {
    try {
      localStorage.setItem('descanso', String(seg))
    } catch {
      /* sem storage: fica só o padrão */
    }
  },
}
