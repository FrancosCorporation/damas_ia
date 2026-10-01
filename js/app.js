// UI da damas — tabuleiro 8x8 (casas escuras), click-move com destaque das capturas, placar, 3 modos.
// O humano é o branco (embaixo, avança para cima). A IA é o preto.

import { estadoInicial, movimentosLegais, aplicar, estadoJogo, corDe, tipoDe, escura } from './damas-rules.js';
import { escolheJogada } from './ai-minimax.js';
import { escolheViaLLM, carregaWebLLM, placaWebGPU, PADRAO as LLM_PADRAO } from './llm.js';

const GLIFOS = { wP: '⚪', wD: '♔', bP: '⚫', bD: '♚' };

let estado = estadoInicial();
let legais = movimentosLegais(estado);
let selecionada = -1;
let modo = 'medio'; // pvp | facil | medio | dificil | llm
let placar = { w: 0, b: 0 };
let animando = false;
let historico = {}; // posição → contagem (repetição = empate)
let sessao = 0; // guarda anti-race: reiniciar no meio do "pensando" não deixa a IA jogar no jogo novo

const $tab = document.getElementById('tabuleiro');
const $status = document.getElementById('status');
const $placar = document.getElementById('placar');
const $selModo = document.getElementById('modo');
const $reiniciar = document.getElementById('reiniciar');
const $llmBox = document.getElementById('llm-box');
const $llmModelo = document.getElementById('llm-modelo');
const $llmCarregar = document.getElementById('llm-carregar');
const $llmStatus = document.getElementById('llm-status');

function cfgLLM() {
  return { modelo: $llmModelo.value || LLM_PADRAO.modelo };
}
function salvaCfgLLM() {
  try { localStorage.setItem('damas-llm', JSON.stringify({ modelo: $llmModelo.value })); } catch {}
}
try { // recupera o que tava salvo
  const s = JSON.parse(localStorage.getItem('damas-llm') || '{}');
  if (s.modelo) $llmModelo.value = s.modelo;
} catch {}
function sincronizaPainelLLM() {
  $llmBox.hidden = modo !== 'llm';
}
// carrega o modelo NA PLACA do jogador (1ª vez baixa ~350MB e fica no cache; depois é 100% local)
async function carregaModeloLLM() {
  const placa = await placaWebGPU();
  if (!placa) {
    $llmStatus.textContent = '⚠ WebGPU desligado — ative UMA vez: chrome://flags/#enable-unsafe-webgpu → Enabled → reabra o navegador (fica pra sempre). Funciona até SEM placa de vídeo: roda na CPU (SwiftShader)';
    return;
  }
  $llmStatus.textContent = 'placa ' + placa.vendor + (placa.arquitetura ? '/' + placa.arquitetura : '') + ' — preparando… 0%';
  try {
    await carregaWebLLM(cfgLLM().modelo, p => {
      $llmStatus.textContent = 'baixando modelo… ' + Math.round(p * 100) + '%';
    });
    $llmStatus.textContent = '✔ modelo pronto na placa (' + placa.vendor + ') — roda 100% local';
  } catch (e) {
    $llmStatus.textContent = '⚠ ' + (e && e.message ? e.message : e);
  }
}
$llmCarregar.addEventListener('click', carregaModeloLLM);
$llmModelo.addEventListener('change', () => { salvaCfgLLM(); if (modo === 'llm') carregaModeloLLM(); });

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
    const idSessao = sessao;
    if (modo === 'llm') {
      avisa('IA LLM pensando…');
      escolheViaLLM(estado, { lance: 1 }, cfgLLM(), {
        progresso: p => { if (sessao === idSessao) $llmStatus.textContent = 'baixando modelo… ' + Math.round(p * 100) + '%'; },
      }).then(r => {
        if (sessao !== idSessao || animando === false) return; // reiniciado no meio
        animando = false;
        if (r.origem === 'llm') avisa('IA LLM: ' + r.motivo);
        else avisa('LLM fora — ' + r.motivo + ' (minimax joga)');
        const m2 = r.lance || escolheJogada(estado, 800); // fallback: minimax assume
        if (m2) joga(m2);
        else {
          placar.w++;
          avisa('Brancas venceram! Clique em Reiniciar.');
        }
      });
      return;
    }
    avisa('A IA está pensando...');
    setTimeout(() => {
      if (sessao !== idSessao) return; // reiniciado no meio
      const cfg = modo === 'facil' ? { tempo: 150, opts: { profMax: 1, ruido: 90 } }
                : modo === 'dificil' ? { tempo: 3000 } : { tempo: 800 };
      const m2 = escolheJogada(estado, cfg.tempo, cfg.opts);
      animando = false;
      if (m2) joga(m2);
      else {
        placar.w++;
        avisa('Brancas venceram! Clique em Reiniciar.');
      }
    }, 120);
  }
}

$selModo.addEventListener('change', () => {
  modo = $selModo.value;
  sincronizaPainelLLM();
  if (modo === 'llm') carregaModeloLLM(); // começa a baixar o modelo já, no ato de escolher o modo
  else $llmStatus.textContent = '';
  reinicia();
});
$reiniciar.addEventListener('click', reinicia);

function reinicia() {
  sessao++;
  estado = estadoInicial();
  legais = movimentosLegais(estado);
  selecionada = -1;
  animando = false;
  historico = {};
  avisa('Vez das brancas');
  pinta();
}

sincronizaPainelLLM();
constroiTabuleiro();
reinicia();

window.__damas = {
  get estado() { return estado; },
  get legais() { return legais; },
  get fase() { return animando ? 'ia' : 'humano'; },
  get modo() { return modo; },
};
