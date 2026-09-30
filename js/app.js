// UI da damas — tabuleiro 8x8 (casas escuras), click-move com destaque das capturas, placar, 3 modos.
// O humano é o branco (embaixo, avança para cima). A IA é o preto.

import { estadoInicial, movimentosLegais, aplicar, estadoJogo, corDe, tipoDe, escura } from './damas-rules.js';
import { escolheJogada } from './ai-minimax.js';

const GLIFOS = { wP: '⚪', wD: '♔', bP: '⚫', bD: '♚' };

let estado = estadoInicial();
let legais = movimentosLegais(estado);
let selecionada = -1;
let modo = 'medio';
let placar = { w: 0, b: 0 };
let animando = false;
let historico = {}; // posição → contagem (repetição = empate)

const $tab = document.getElementById('tabuleiro');
const $status = document.getElementById('status');
const $placar = document.getElementById('placar');
const $selModo = document.getElementById('modo');
const $reiniciar = document.getElementById('reiniciar');

function constroiTabuleiro() {
  $tab.innerHTML = '';
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const i = rank * 8 + file;
      const casa = document.createElement('div');
      casa.className = `casa ${escura(i) ? 'escura' : 'clara'}`;
      casa.dataset.i = i;
      casa.addEventListener('click', () => clique(i));
      $tab.appendChild(casa);
    }
  }
}

function pinta() {
  for (const casa of $tab.children) {
    const bi = parseInt(casa.dataset.i, 10);
    const p = estado.tabuleiro[bi];
    casa.textContent = p ? GLIFOS[p] : '';
    casa.classList.toggle('sel', bi === selecionada);
    casa.classList.toggle('alvo', legais.some(m => m.from === selecionada && m.to === bi));
    const capturavel = legais.some(m => m.from === selecionada && m.capturas.includes(bi));
    casa.classList.toggle('capturavel', capturavel);
  }
  $placar.textContent = `Brancas ${placar.w} × ${placar.b} Pretas`;
}

function avisa(msg) { $status.textContent = msg; }

function clique(i) {
  if (animando) return;
  if (estadoJogo(estado) !== 'andamento') return;

  const p = estado.tabuleiro[i];
  if (selecionada >= 0) {
    const m = legais.find(m => m.from === selecionada && m.to === i);
    if (m) { joga(m); return; }
  }
  if (p && corDe(p) === estado.turno) {
    // só permite selecionar peças com lance legal
    if (legais.some(m => m.from === i)) {
      selecionada = i;
      pinta();
    }
  } else {
    selecionada = -1;
    pinta();
  }
}

function joga(m) {
  estado = aplicar(estado, m);
  selecionada = -1;
  legais = movimentosLegais(estado);
  const fim = estadoJogo(estado);
  const pos = estado.tabuleiro.map(x => x || '.').join('') + estado.turno;
  historico[pos] = (historico[pos] || 0) + 1;
  pinta();

  if (fim === 'vitoria') {
    const vencedor = estado.turno === 'w' ? 'Pretas' : 'Brancas';
    placar[estado.turno === 'w' ? 'b' : 'w']++;
    avisa(`${vencedor} venceram! ${m.capturas.length ? 'Última captura foi decisiva. ' : ''}Clique em Reiniciar.`);
    pinta();
    return;
  }
  if (historico[pos] >= 3) { avisa('Empate por repetição (a mesma posição 3 vezes).'); return; }

  const detalhe = m.capturas.length > 1 ? ` (${m.capturas.length} capturas!)` : m.capturas.length ? ' (captura)' : '';
  avisa(estado.turno === 'w' ? `Vez das brancas${detalhe}` : `Vez das pretas${detalhe}`);

  if (estado.turno === 'b' && modo !== 'pvp') {
    animando = true;
    avisa('A IA está pensando...');
    setTimeout(() => {
      const tempo = modo === 'impossivel' ? 2500 : 800;
      const m2 = escolheJogada(estado, tempo);
      animando = false;
      if (m2) joga(m2);
      else {
        placar.w++;
        avisa('Brancas venceram! Clique em Reiniciar.');
      }
    }, 120);
  }
}

$selModo.addEventListener('change', () => { modo = $selModo.value; reinicia(); });
$reiniciar.addEventListener('click', reinicia);

function reinicia() {
  estado = estadoInicial();
  legais = movimentosLegais(estado);
  selecionada = -1;
  animando = false;
  historico = {};
  avisa('Vez das brancas');
  pinta();
}

constroiTabuleiro();
reinicia();

window.__damas = {
  get estado() { return estado; },
  get legais() { return legais; },
  get fase() { return animando ? 'ia' : 'humano'; },
};
