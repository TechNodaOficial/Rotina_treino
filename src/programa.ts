import { db, type TreinoItem } from './db'

/*
 * Programa de hipertrofia: 5 dias (Seg pernas/quadríceps, Ter push, Qua pull,
 * Sex pernas/posterior, Sáb upper). Cada músculo é treinado ~2x/semana com
 * 10–20 séries de trabalho semanais. Detalhes e fontes em PROGRAMA.md.
 */

// Protocolos de aquecimento
const RAMPA =
  'Rampa: 1×10 com ~50% · 1×5 com ~70% · 1×2-3 com ~85-90% (feeder pesado / PAP). Descanse 2-3 min e vá para o trabalho.'
const RAMPA_CURTA = 'Feeder: 1×8 com ~50% · 1×4 com ~75% da carga de trabalho.'
const FEEDER = 'Feeder: 1×6-8 com ~60% da carga de trabalho.'
const DIRETO = 'Sem aquecimento: o músculo já está quente. Comece direto no trabalho.'

interface ItemPrograma {
  nome: string
  grupo: string
  series: number
  reps: string
  descanso: number
  aquecimento: string
  nota: string
}

interface TreinoPrograma {
  nome: string
  dias: number[]
  itens: ItemPrograma[]
}

export const PROGRAMA: TreinoPrograma[] = [
  {
    nome: 'Seg · Pernas A (quadríceps)',
    dias: [1],
    itens: [
      { nome: 'Agachamento livre', grupo: 'Pernas', series: 3, reps: '6-8', descanso: 180, aquecimento: RAMPA, nota: 'Desça até pelo menos a coxa paralela. 1-2 RIR.' },
      { nome: 'Leg press', grupo: 'Pernas', series: 3, reps: '10-12', descanso: 150, aquecimento: FEEDER, nota: 'Pés no meio/baixo da plataforma para enfatizar quadríceps. Amplitude máxima sem tirar o quadril do banco.' },
      { nome: 'Agachamento búlgaro', grupo: 'Pernas', series: 2, reps: '8-10', descanso: 120, aquecimento: DIRETO, nota: 'Cada perna. Tronco mais vertical = mais quadríceps.' },
      { nome: 'Cadeira extensora', grupo: 'Pernas', series: 3, reps: '12-15', descanso: 90, aquecimento: DIRETO, nota: 'Segure 1 s em cima. Última série até a falha.' },
      { nome: 'Mesa flexora', grupo: 'Pernas', series: 2, reps: '10-12', descanso: 90, aquecimento: FEEDER, nota: 'Manutenção do posterior. Controle a descida (2-3 s).' },
      { nome: 'Panturrilha em pé', grupo: 'Pernas', series: 4, reps: '8-12', descanso: 75, aquecimento: FEEDER, nota: 'Pausa de 1-2 s embaixo (alongado). Sem quicar.' },
      { nome: 'Abdominal na polia', grupo: 'Core', series: 3, reps: '10-15', descanso: 60, aquecimento: DIRETO, nota: 'Enrole a coluna, não puxe com os braços. Aumente a carga como em qualquer exercício.' },
    ],
  },
  {
    nome: 'Ter · Push (peito, ombro, tríceps)',
    dias: [2],
    itens: [
      { nome: 'Supino reto', grupo: 'Peito', series: 3, reps: '6-8', descanso: 180, aquecimento: RAMPA, nota: 'Escápulas retraídas, pés firmes. Barra toca o peito. 1-2 RIR.' },
      { nome: 'Supino inclinado', grupo: 'Peito', series: 3, reps: '8-10', descanso: 150, aquecimento: FEEDER, nota: 'Com halteres, banco a 30°. Alongue bem embaixo.' },
      { nome: 'Desenvolvimento', grupo: 'Ombros', series: 3, reps: '8-10', descanso: 120, aquecimento: FEEDER, nota: 'Halteres ou máquina. Não arqueie a lombar.' },
      { nome: 'Crossover', grupo: 'Peito', series: 2, reps: '12-15', descanso: 90, aquecimento: DIRETO, nota: 'Polia na altura do ombro. Aperte 1 s no fim.' },
      { nome: 'Elevação lateral', grupo: 'Ombros', series: 4, reps: '12-15', descanso: 75, aquecimento: DIRETO, nota: 'Cotovelo levemente flexionado, suba até a linha do ombro. Carga moderada, sem roubar.' },
      { nome: 'Tríceps pulley', grupo: 'Tríceps', series: 3, reps: '10-12', descanso: 90, aquecimento: FEEDER, nota: 'Cotovelos colados no corpo. Extensão completa.' },
      { nome: 'Tríceps francês', grupo: 'Tríceps', series: 2, reps: '10-12', descanso: 90, aquecimento: DIRETO, nota: 'Na polia ou halter. Braço acima da cabeça alonga a cabeça longa.' },
    ],
  },
  {
    nome: 'Qua · Pull (costas, bíceps)',
    dias: [3],
    itens: [
      { nome: 'Puxada frontal', grupo: 'Costas', series: 3, reps: '8-10', descanso: 150, aquecimento: RAMPA_CURTA, nota: 'Pegada um pouco mais aberta que os ombros. Leve a barra ao peito, peito para cima. Pode trocar por barra fixa.' },
      { nome: 'Remada curvada', grupo: 'Costas', series: 3, reps: '8-10', descanso: 150, aquecimento: FEEDER, nota: 'Tronco a ~45°, coluna neutra. Puxe em direção ao umbigo.' },
      { nome: 'Remada baixa', grupo: 'Costas', series: 3, reps: '10-12', descanso: 120, aquecimento: DIRETO, nota: 'Alongue à frente, aperte as escápulas atrás por 1 s.' },
      { nome: 'Crucifixo inverso', grupo: 'Ombros', series: 3, reps: '12-15', descanso: 75, aquecimento: DIRETO, nota: 'Posterior de ombro. Peck deck invertido ou halteres.' },
      { nome: 'Rosca direta', grupo: 'Bíceps', series: 3, reps: '8-12', descanso: 90, aquecimento: FEEDER, nota: 'Sem balançar o tronco. Desça em 2-3 s.' },
      { nome: 'Rosca martelo', grupo: 'Bíceps', series: 2, reps: '10-12', descanso: 75, aquecimento: DIRETO, nota: 'Trabalha braquial e antebraço.' },
    ],
  },
  {
    nome: 'Sex · Pernas B (posterior)',
    dias: [5],
    itens: [
      { nome: 'Stiff', grupo: 'Pernas', series: 3, reps: '6-8', descanso: 180, aquecimento: RAMPA, nota: 'Quadril para trás, joelho levemente flexionado, barra rente às pernas. Pare quando a lombar quiser arredondar.' },
      { nome: 'Mesa flexora', grupo: 'Pernas', series: 3, reps: '10-12', descanso: 90, aquecimento: DIRETO, nota: 'Controle a descida (2-3 s).' },
      { nome: 'Cadeira flexora', grupo: 'Pernas', series: 3, reps: '10-12', descanso: 90, aquecimento: DIRETO, nota: 'Sentado alonga mais o posterior. Última série até a falha.' },
      { nome: 'Hip thrust', grupo: 'Pernas', series: 3, reps: '8-10', descanso: 120, aquecimento: FEEDER, nota: 'Queixo para baixo, costelas fechadas. Segure 1 s em cima.' },
      { nome: 'Leg press', grupo: 'Pernas', series: 2, reps: '10-12', descanso: 120, aquecimento: FEEDER, nota: 'Pés altos na plataforma: mais glúteo e posterior.' },
      { nome: 'Panturrilha sentado', grupo: 'Pernas', series: 4, reps: '12-15', descanso: 60, aquecimento: FEEDER, nota: 'Pausa de 1-2 s embaixo. Foca no sóleo.' },
      { nome: 'Elevação de pernas', grupo: 'Core', series: 3, reps: '10-15', descanso: 60, aquecimento: DIRETO, nota: 'Pendurado ou no banco. Suba o quadril, não só as pernas.' },
    ],
  },
  {
    nome: 'Sáb · Upper',
    dias: [6],
    itens: [
      { nome: 'Supino inclinado', grupo: 'Peito', series: 3, reps: '6-10', descanso: 150, aquecimento: RAMPA_CURTA, nota: 'Com barra ou máquina (varie em relação à terça).' },
      { nome: 'Remada unilateral', grupo: 'Costas', series: 3, reps: '8-12', descanso: 120, aquecimento: FEEDER, nota: 'Halter, apoio no banco. Puxe o cotovelo em direção ao quadril.' },
      { nome: 'Puxada frontal', grupo: 'Costas', series: 2, reps: '10-12', descanso: 120, aquecimento: DIRETO, nota: 'Pegada neutra/fechada para variar o estímulo.' },
      { nome: 'Crucifixo', grupo: 'Peito', series: 2, reps: '12-15', descanso: 90, aquecimento: DIRETO, nota: 'Peck deck ou halteres. Foco no alongamento.' },
      { nome: 'Elevação lateral', grupo: 'Ombros', series: 3, reps: '12-15', descanso: 75, aquecimento: DIRETO, nota: 'Pode fazer na polia para tensão constante.' },
      { nome: 'Rosca alternada', grupo: 'Bíceps', series: 2, reps: '10-12', descanso: 75, aquecimento: DIRETO, nota: 'Opcional: biset com o tríceps para ganhar tempo.' },
      { nome: 'Tríceps pulley', grupo: 'Tríceps', series: 2, reps: '10-12', descanso: 75, aquecimento: DIRETO, nota: 'Corda ou barra.' },
      { nome: 'Crucifixo inverso', grupo: 'Ombros', series: 2, reps: '15-20', descanso: 60, aquecimento: DIRETO, nota: 'Leve e controlado.' },
    ],
  },
]

/** Adiciona os treinos do programa (e exercícios que faltarem). Não apaga nada. */
export async function carregarPrograma(): Promise<number> {
  return db.transaction('rw', db.exercicios, db.treinos, async () => {
    const porNome = new Map((await db.exercicios.toArray()).map((e) => [e.nome.toLowerCase(), e.id]))
    let criados = 0
    for (const t of PROGRAMA) {
      if (await db.treinos.where('nome').equals(t.nome).count()) continue
      const itens: TreinoItem[] = []
      for (const { nome, grupo, ...resto } of t.itens) {
        let id = porNome.get(nome.toLowerCase())
        if (!id) {
          id = await db.exercicios.add({ nome, grupo })
          porNome.set(nome.toLowerCase(), id)
        }
        itens.push({ exercicioId: id, ...resto })
      }
      await db.treinos.add({ nome: t.nome, dias: t.dias, itens })
      criados++
    }
    return criados
  })
}
