// Regras da damas (8x8, captura obrigatória e máxima, cadeia de capturas, dama voadora) em JS puro.
// Casa vazia = null | Peça = 'wP' (peão branco), 'wD' (dama branca), 'bP', 'bD'
// Só as casas ESCURAS entram no jogo: (file + rank) % 2 === 0 (a1 = escura).
// Índice 0 = a1 (lado branco embaixo). file = i % 8, rank = i / 8.

export const BRANCO = 'w';
export const PRETO = 'b';

const DIAGONAIS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export const escura = (i) => ((i % 8) + Math.floor(i / 8)) % 2 === 0;

export function estadoInicial() {
  const tab = new Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if (!escura(i)) continue;
    const r = Math.floor(i / 8);
    if (r <= 2) tab[i] = 'wP';       // ranks 1-3: peões brancos
    else if (r >= 5) tab[i] = 'bP';  // ranks 6-8: peões pretos
  }
  return { tabuleiro: tab, turno: BRANCO };
}

export const corDe = (p) => (p ? p[0] : null);
export const tipoDe = (p) => (p ? p[1] : null);
export const noTab = (i) => i >= 0 && i < 64;

// capturas encadeadas a partir de uma peça (DFS): devolve as sequências máximas
// regra brasileira: captura obrigatória E máxima; peça capturada não se repete (removida na hora);
// peão que TERMINA a sequência na última fileira vira dama (passar por ela não promove)
function sequenciasDeCaptura(tab, de, acumulado = { capturas: [], caminho: [de] }) {
  const p = tab[de];
  const cor = corDe(p), tipo = tipoDe(p);
  const f = de % 8, r = Math.floor(de / 8);
  const out = [];

  if (tipo === 'P') {
    for (const [df, dr] of DIAGONAIS) {
      const fAlvo = f + df * 2, rAlvo = r + dr * 2;
      const fMeio = f + df, rMeio = r + dr;
      if (fAlvo < 0 || fAlvo > 7 || rAlvo < 0 || rAlvo > 7) continue;
      const meio = rMeio * 8 + fMeio, alvo = rAlvo * 8 + fAlvo;
      if (!tab[meio] || corDe(tab[meio]) === cor) continue;
      if (tab[alvo]) continue;
      // pula (a vítima sai do tabuleiro na hora: não bloqueia e não é recapturada)
      const novoTab = tab.slice();
      novoTab[alvo] = novoTab[de];
      novoTab[de] = null;
      novoTab[meio] = null;
      const seq = { capturas: [...acumulado.capturas, meio], caminho: [...acumulado.caminho, alvo] };
      const mais = sequenciasDeCaptura(novoTab, alvo, seq);
      if (mais.length) out.push(...mais);
      else out.push(seq);
    }
  } else {
    // dama voadora: anda qualquer distância; captura pulando UMA peça com casas vazias antes/depois
    for (const [df, dr] of DIAGONAIS) {
      let ff = f + df, rr = r + dr;
      // casas vazias até a peça a capturar
      while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8 && !tab[rr * 8 + ff]) { ff += df; rr += dr; }
      if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
      const vitima = rr * 8 + ff;
      if (!tab[vitima] || corDe(tab[vitima]) === cor) continue;
      // pousa em qualquer casa vazia depois da vítima
      let fPouso = ff + df, rPouso = rr + dr;
      while (fPouso >= 0 && fPouso < 8 && rPouso >= 0 && rPouso < 8 && !tab[rPouso * 8 + fPouso]) {
        const pouso = rPouso * 8 + fPouso;
        const novoTab = tab.slice();
        novoTab[pouso] = novoTab[de];
        novoTab[de] = null;
        novoTab[vitima] = null;
        const seq = { capturas: [...acumulado.capturas, vitima], caminho: [...acumulado.caminho, pouso] };
        const mais = sequenciasDeCaptura(novoTab, pouso, seq);
        if (mais.length) out.push(...mais);
        else out.push(seq);
        fPouso += df; rPouso += dr;
      }
    }
  }
  return out;
}

// lances legais: captura obrigatória E máxima (regra brasileira); sem captura = movimentos simples
export function movimentosLegais(estado) {
  const { tabuleiro: tab, turno } = estado;
  const todas = [];
  for (let i = 0; i < 64; i++) {
    const p = tab[i];
    if (!p || corDe(p) !== turno) continue;

    // capturas encadeadas primeiro
    const seqs = sequenciasDeCaptura(tab, i);
    for (const s of seqs) {
      todas.push({ from: i, to: s.caminho[s.caminho.length - 1], capturas: s.capturas, caminho: s.caminho });
    }

    // movimentos simples (só se não houver captura nenhuma — decidido depois)
    if (!seqs.length) {
      const f = i % 8, r = Math.floor(i / 8);
      if (tipoDe(p) === 'P') {
        const dir = turno === 'w' ? 1 : -1;
        for (const df of [-1, 1]) {
          const ff = f + df, rr = r + dir;
          if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
          if (!tab[rr * 8 + ff]) todas.push({ from: i, to: rr * 8 + ff, capturas: [] });
        }
      } else {
        for (const [df, dr] of DIAGONAIS) {
          let ff = f + df, rr = r + dr;
          while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8 && !tab[rr * 8 + ff]) {
            todas.push({ from: i, to: rr * 8 + ff, capturas: [] });
            ff += df; rr += dr;
          }
        }
      }
    }
  }

  const capturas = todas.filter(m => m.capturas.length > 0);
  if (!capturas.length) return todas;
  // captura MÁXIMA obrigatória
  const max = Math.max(...capturas.map(m => m.capturas.length));
  return capturas.filter(m => m.capturas.length === max);
}

// aplica o lance e devolve o novo estado (sem mutar o original)
export function aplicar(estado, m) {
  const tab = estado.tabuleiro.slice();
  const peca = tab[m.from];
  const cor = corDe(peca);

  tab[m.from] = null;
  for (const c of m.capturas) tab[c] = null;
  tab[m.to] = m.capturas.length === 0 ? peca : tipoDe(peca) === 'P' ? peca : peca;

  // promoção: peão que TERMINA o lance na última fileira vira dama
  const rFinal = Math.floor(m.to / 8);
  if (tipoDe(peca) === 'P' && ((cor === 'w' && rFinal === 7) || (cor === 'b' && rFinal === 0))) {
    tab[m.to] = cor + 'D';
  }

  return { tabuleiro: tab, turno: cor === 'w' ? PRETO : BRANCO };
}

// estado do jogo: 'andamento' | 'vitoria' (quem tem a vez PERDEU: sem peças ou sem lances)
export function estadoJogo(estado) {
  const temPecas = estado.tabuleiro.some(p => p && corDe(p) === estado.turno);
  if (!temPecas) return 'vitoria';
  if (movimentosLegais(estado).length === 0) return 'vitoria';
  return 'andamento';
}
