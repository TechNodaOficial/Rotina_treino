/** Ícones de traço (estilo Lucide), desenhados inline para não depender de biblioteca. */
const PATHS = {
  hoje: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  treinos: ['M8 12h8', 'M5 7h3v10H5z', 'M16 7h3v10h-3z', 'M2 10v4', 'M22 10v4'],
  historico: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  exercicios: ['M3 6h.01', 'M3 12h.01', 'M3 18h.01', 'M8 6h13', 'M8 12h13', 'M8 18h13'],
  ajustes: ['M20 7h-9', 'M14 17H5', 'M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  fechar: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  mais: ['M5 12h14', 'M12 5v14'],
  menos: ['M5 12h14'],
  voltar: ['m15 18-6-6 6-6'],
  seguir: ['m9 18 6-6-6-6'],
  cima: ['m18 15-6-6-6 6'],
  baixo: ['m6 9 6 6 6-6'],
  busca: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  fogo: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
} as const

export type NomeIcone = keyof typeof PATHS

export default function Icone({ nome, tamanho = 20 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      className="ico"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[nome].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
