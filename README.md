# Damas com IA

Eu queria jogar damas no navegador com as regras de verdade do Brasil — captura obrigatória e máxima, dama voadora, cadeia de capturas — e uma IA que joga de posição, não de sorte. Então construí o meu: o jogo inteiro é HTML, CSS e JavaScript puro, e a IA (Minimax com poda alfa-beta e iterative deepening) roda dentro do browser.

## O que tem

- **Regras brasileiras implementadas à mão**: captura obrigatória **e máxima** (com captura dupla/tripla disponível, só a maior vale), **cadeia de capturas** com a mesma peça (a peça capturada não bloqueia e não é recapturada), **dama voadora** (anda qualquer distância na diagonal e captura pulando UMA peça com casas vazias antes/depois), promoção só quando o peão TERMINA o lance na última fileira
- **IA de posição** (negamax com poda): material (peão 100, dama 300) + avanço dos peões, **iterative deepening com orçamento de tempo** (PC = 800ms, Impossível = 2500ms) e **variedade na escolha** (entre lances quase equivalentes sorteia — nunca shuffla)
- **3 modos**: Jogador × Jogador, Jogador × PC, Impossível
- **Placar de sessão**, destaque da peça selecionada, das casas de destino e das peças capturáveis (✕ vermelho)

## Como rodar

```bash
npm start          # sobe o servidor estático em http://localhost:3346
npm test           # 19 testes das regras + da IA (node --test)
```

**Jogue online agora**: https://francoscorporation.github.io/damas_ia/ — o jogo é 100% estático (servidor só serve arquivos). Para rodar local use `npm start` (abrir o index.html direto via file:// não carrega os módulos ES do navegador).

## Como foi testado

19 testes automatizados (node --test) cobrindo as regras e a IA, todos passando:

- **Regras (11)**: 24 peças na posição inicial (só em casas escuras) · peão anda só na diagonal para frente · captura obrigatória (com captura disponível, só capturas são legais) · captura simples (pula e pousa além) · cadeia de captura dupla com promoção (d4×c5→b6×c7→d8 vira dama) · captura máxima obrigatória · promoção do peão · dama voadora (anda longe) · captura da dama (pula a vítima com casas vazias antes/depois) · vitória (sem peças ou sem lances) · o turno inverte
- **IA (8)**: lance legal da posição inicial · captura quando disponível · prefere a captura dupla sobre a simples · vence capturando a última peça · avaliação por material · escolheJogada com orçamento de tempo · profundidade 4 em menos de 5s · não shuffla em partida longa

O bug de design encontrado pelos próprios testes: a flag de "peça capturada" era escrita numa string (impossível em JS) — corrigido com a remoção imediata da vítima no tabuleiro (o mesmo efeito das regras brasileiras: a capturada não bloqueia e não é recapturada).

## Estrutura

```
damas_ia/
├── index.html         # o jogo
├── style.css
├── server.js          # servidor estático (sem build)
├── js/
│   ├── damas-rules.js # regras: captura obrigatória e máxima, cadeia, dama voadora, promoção
│   ├── ai-minimax.js  # negamax com poda + iterative deepening + variedade
│   └── app.js         # UI: click-move, destaque de capturas, placar, modos
└── test/
    ├── damas-rules-test.mjs
    └── ia-test.mjs
```

## Sobre a série

Este é o quarto jogo da série de jogos com IA: [Jogo da Velha](https://github.com/FrancosCorporation/jogo_da_velha_ia) → [Xadrez](https://github.com/FrancosCorporation/xadrez_ia) → [Futebol de Botão](https://github.com/FrancosCorporation/botao_ia) → Damas. Jogos clássicos no navegador, com IA rodando no browser, sem dependência externa e com testes provando as regras.

Código aberto: https://github.com/FrancosCorporation/damas_ia
