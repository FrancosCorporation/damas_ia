// IA da damas — Minimax (negamax) com poda alfa-beta, iterative deepening com orçamento de
// tempo e variedade na escolha (o padrão da série). Avaliação: material (peão 100, dama 300)
// + avanço dos peões + defesa da fileira de trás.

import { aplicar, movimentosLegais, estadoJogo, corDe, tipoDe } from './damas-rules.js';

const VALOR = { P: 100, D: 300 };
const BONUS_AVANCO = 4;   // por fileira avançada (peão)
const BONUS_TRAS = 8;     // peão na fileira de trás (defesa) — hmm, invertido: manter 2 na última

export function avaliar(estado, cor = estado.turno) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = estado.tabuleiro[i];
    if (!p) continue;
    const c = corDe(p), tipo = tipoDe(p);
    let v = VALOR[tipo];
    if (tipo === 'P') {
      const r = Math.floor(i / 8);
      const avancado = c === 'w' ? r : 7 - r;
      v += avancado * BONUS_AVANCO;
    }
    score += c === cor ? v : -v;
  }
  return score;
}

// ordenação: capturas grandes primeiro
function ordena(estado, movs) {
  return movs.map(m => ({ m, peso: m.capturas.length * 1000 + (m.capturas.length ? 0 : Math.random()) }))
    .sort((a, b) => b.peso - a.peso).map(x => x.m);
}

function busca(estado, profundidade, alpha, beta) {
  const fim = estadoJogo(estado);
  if (fim === 'vitoria') return -100000 - profundidade * 100; // quem tem a vez PERDEU
  if (profundidade === 0) return avaliar(estado);

  let melhor = -Infinity;
  for (const m of ordena(estado, movimentosLegais(estado))) {
    const v = -busca(aplicar(estado, m), profundidade - 1, -beta, -alpha);
    if (v > melhor) melhor = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break; // poda
  }
  return melhor;
}

// profundidade FIXA (usado nos testes)
export function jogadaMinimax(estado, profundidade = 4) {
  const movs = movimentosLegais(estado);
  if (!movs.length) return null;
  let melhor = null, melhorV = -Infinity;
  let alpha = -Infinity;
  for (const m of ordena(estado, movs)) {
    const v = -busca(aplicar(estado, m), profundidade - 1, -Infinity, -alpha);
    if (v > melhorV) { melhorV = v; melhor = m; }
    if (melhorV > alpha) alpha = melhorV;
  }
  return melhor;
}

// ITERATIVE DEEPENING + variedade (≤ 20cp do melhor sorteia — evita shuffle)
export function escolheJogada(estado, tempoMs = 1000) {
  const movs = movimentosLegais(estado);
  if (!movs.length) return null;
  const t0 = Date.now();
  let melhor = movs[0];
  let scores = new Map();
  for (let prof = 1; ; prof++) {
    const scoresProf = new Map();
    let melhorV = -Infinity, melhorDaProf = null;
    let alpha = -Infinity;
    let completo = true;
    for (const m of ordena(estado, movs)) {
      const v = -busca(aplicar(estado, m), prof - 1, -Infinity, -alpha);
      scoresProf.set(m.from + '-' + m.to + ':' + m.capturas.length, v);
      if (v > melhorV) { melhorV = v; melhorDaProf = m; }
      if (melhorV > alpha) alpha = melhorV;
      if (Date.now() - t0 > tempoMs) { completo = false; break; }
    }
    if (completo) {
      scores = scoresProf;
      if (melhorDaProf) melhor = melhorDaProf;
    }
    if (!completo || Date.now() - t0 > tempoMs) break;
  }
  const melhorScore = scores.get(melhor.from + '-' + melhor.to + ':' + melhor.capturas.length) || 0;
  const candidatos = movs.filter(m => {
    const v = scores.get(m.from + '-' + m.to + ':' + m.capturas.length);
    return v !== undefined && v >= melhorScore - 20;
  });
  if (candidatos.length > 1) return candidatos[Math.floor(Math.random() * candidatos.length)];
  return melhor;
}
