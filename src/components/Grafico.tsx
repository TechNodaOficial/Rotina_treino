import { fmtNum } from '../util'

interface Ponto {
  x: number // timestamp
  y: number
}

const L = 320
const A = 160
const P = { top: 16, dir: 12, base: 24, esq: 40 }

export default function Grafico({ pontos, unidade = 'kg' }: { pontos: Ponto[]; unidade?: string }) {
  if (pontos.length < 2) return <p className="vazio">Registre pelo menos 2 treinos para ver o gráfico.</p>

  const xs = pontos.map((p) => p.x)
  const ys = pontos.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  if (y0 === y1) [y0, y1] = [y0 - 1, y1 + 1]

  const px = (x: number) => P.esq + ((x - x0) / (x1 - x0 || 1)) * (L - P.esq - P.dir)
  const py = (y: number) => P.top + (1 - (y - y0) / (y1 - y0)) * (A - P.top - P.base)
  const linha = pontos.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')
  const data = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <svg className="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Evolução de carga">
      {[y0, (y0 + y1) / 2, y1].map((v) => (
        <g key={v}>
          <line x1={P.esq} x2={L - P.dir} y1={py(v)} y2={py(v)} className="grade" />
          <text x={P.esq - 6} y={py(v) + 4} textAnchor="end">
            {fmtNum(Math.round(v))}
          </text>
        </g>
      ))}
      <polyline points={linha} className="linha" />
      {pontos.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3.5} className="ponto">
          <title>{`${data(p.x)}: ${fmtNum(p.y)} ${unidade}`}</title>
        </circle>
      ))}
      <text x={P.esq} y={A - 6}>{data(x0)}</text>
      <text x={L - P.dir} y={A - 6} textAnchor="end">{data(x1)}</text>
    </svg>
  )
}
