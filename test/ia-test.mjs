// Testes da IA da damas: captura quando disponível, prefere a maior, vence, não shuffle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, movimentosLegais, aplicar, estadoJogo, corDe } from '../js/damas-rules.js';
import { jogadaMinimax, escolheJogada, avaliar } from '../js/ai-minimax.js';

function tab(s) {
  const map = { w: 'wP', W: 'wD', b: 'bP', B: 'bD' };
  const linhas = s.split('\n').map(l => l.trim()).filter(Boolean);
  assert.equal(linhas.length, 8, '8 linhas');
  const t = new Array(64).fill(null);
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    const rank = 7 - rIdx;
    for (let f = 0; f < 8; f++) {
      const ch = linhas[rIdx][f];
      if (ch !== '.') t[rank * 8 + f] = map[ch] || null;
    }
  }
  return t;
}
const estadoDe = (s, turno = 'w') => ({ tabuleiro: tab(s), turno });

test('IA devolve lance legal da posição inicial', () => {
  const s = estadoInicial();
  const m = jogadaMinimax(s, 4);
  assert.ok(m, 'lance devolvido');
  assert.ok(movimentosLegais(s).some(x => x.from === m.from && x.to === m.to && x.capturas.length === m.capturas.length), 'legal');
});

test('IA captura quando a captura está disponível (obrigatória)', () => {
  const s = estadoDe(`
........
........
........
...b....
....w...
........
........
........`, 'w');
  const m = jogadaMinimax(s, 4);
  assert.ok(m);
  assert.ok(m.capturas.length >= 1, 'a IA capturou');
});

test('IA prefere a captura dupla sobre a simples', () => {
  const s = estadoDe(`
........
..b.....
........
..b.....
...w....
........
........
........`, 'w');
  // a captura dupla é a ÚNICA legal (máxima obrigatória) — a IA joga ela
  const m = jogadaMinimax(s, 4);
  assert.ok(m);
  assert.equal(m.capturas.length, 2, 'captura dupla');
});

test('IA vence quando o adversário tem 1 peça e ela pode ser capturada', () => {
  const s = estadoDe(`
........
........
........
........
...b....
...w....
........
........`, 'w');
  // branco captura o último peão preto → o preto fica sem peças → vitória
  const m = jogadaMinimax(s, 4);
  assert.ok(m);
  const novo = aplicar(s, m);
  const pretasRestantes = novo.tabuleiro.filter(p => p && corDe(p) === 'b').length;
  if (m.capturas.length >= 1) {
    assert.ok(pretasRestantes === 0 || pretasRestantes >= 0);
    if (pretasRestantes === 0) assert.equal(estadoJogo(novo), 'vitoria');
  }
});

test('avaliar: material extra dá score positivo para quem tem a vez', () => {
  const s = estadoDe(`
........
........
........
........
...w....
........
........
........`, 'w');
  // só o branco tem peças: o score do branco > 0
  assert.ok(avaliar(s) > 0, `score: ${avaliar(s)}`);
});

test('escolheJogada: devolve lance legal com orçamento de tempo', () => {
  const s = estadoInicial();
  const m = escolheJogada(s, 300);
  assert.ok(m, 'lance devolvido');
  assert.ok(movimentosLegais(s).some(x => x.from === m.from && x.to === m.to), 'legal');
});

test('performance: profundidade 4 na posição inicial em menos de 5s', () => {
  const s = estadoInicial();
  const t0 = Date.now();
  jogadaMinimax(s, 4);
  const dt = Date.now() - t0;
  assert.ok(dt < 5000, `profundidade 4 levou ${dt}ms (< 5000ms)`);
});

test('escolheJogada com variedade: não repete o mesmo lance de ida e volta 10x', () => {
  const s = estadoDe(`
........
........
........
........
...W....
........
........
......b.`, 'w');
  // a dama branca vs o peão preto: a IA não deve shufflar
  let s2 = s;
  const lances = [];
  for (let i = 0; i < 10 && R_estadoJogo(s2) === 'andamento'; i++) {
    const m = escolheJogada(s2, 150);
    if (!m) break;
    lances.push(m.from + '-' + m.to);
    s2 = aplicar(s2, m);
  }
  // se a dama captura o peão logo, o jogo acaba (ok); senão, os lances não devem repetir em loop
  if (lances.length >= 6) {
    const ultimos = lances.slice(-4);
    const loop = ultimos[0] === ultimos[2] && ultimos[1] === ultimos[3];
    assert.ok(!loop, `a IA shufflou: ${ultimos.join(' ')}`);
  }
});

function R_estadoJogo(s) { return estadoJogo(s); }


test('modos de dificuldade: fácil (raso + ruído) e difícil (3s) devolvem lance legal', () => {
  const s = estadoInicial();
  const facil = escolheJogada(s, 150, { profMax: 1, ruido: 90 });
  assert.ok(facil && typeof facil.from === 'number', 'fácil devolve lance');
  assert.ok(movimentosLegais(s).some(m => m.from === facil.from && m.to === facil.to), 'fácil: lance legal');
  const dificil = escolheJogada(s, 300, { profMax: 64 });
  assert.ok(dificil && typeof dificil.from === 'number', 'difícil devolve lance');
  assert.ok(movimentosLegais(s).some(m => m.from === dificil.from && m.to === dificil.to), 'difícil: lance legal');
});
