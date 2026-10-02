# Damas com IA

Eu queria jogar damas no navegador com as regras de verdade do Brasil — captura obrigatória e máxima, dama voadora, cadeia de capturas — e uma IA que joga de posição, não de sorte. Então construí o meu: o jogo inteiro é HTML, CSS e JavaScript puro, e a IA (Minimax com poda alfa-beta e iterative deepening) roda dentro do browser.

## O que tem

- **Regras brasileiras implementadas à mão**: captura obrigatória **e máxima** (com captura dupla/tripla disponível, só a maior vale), **cadeia de capturas** com a mesma peça (a peça capturada não bloqueia e não é recapturada), **dama voadora** (anda qualquer distância na diagonal e captura pulando UMA peça com casas vazias antes/depois), promoção só quando o peão TERMINA o lance na última fileira
- **IA de posição** (negamax com poda): material (peão 100, dama 300) + avanço dos peões, **iterative deepening com orçamento de tempo** e **variedade na escolha** (entre lances quase equivalentes sorteia — nunca shuffla)
- **4 modos**: Jogador × Jogador · **IA Fácil** (busca rasa + ruído ±90cp na escolha — erra lances de verdade) · **IA Média** (800ms) · **IA Difícil** (3000ms de iterative deepening — mais fundo)
- **Placar de sessão**, destaque da peça selecionada, das casas de destino e das peças capturáveis (✕ vermelho)
- **Modo LLM: a IA de verdade roda DENTRO do navegador** (separado abaixo)

## Modo LLM — inteligência artificial local, sem servidor

Escolha "LLM (roda no navegador)" no seletor Modo. Aí o jogo para de usar o minimax e passa a
chamar uma **LLM de verdade** — mas tudo rodando na sua própria máquina:

- **Zero servidor, zero API**: a biblioteca WebLLM está embutida no repositório
  (`js/vendor/webllm.esm.js`) e o modelo (Qwen2.5-0.5B, ~350MB) é baixado **uma única vez**
  pelo navegador, fica no cache local e a inferência acontece **dentro do navegador**.
  Depois do primeiro download, joga 100% offline.
- **NÃO depende de placa de vídeo** — o jogo escolhe o motor sozinho:
  - **Com WebGPU**: o modelo roda na GPU via WebLLM (~64 tok/s no Qwen2.5-0.5B) — é o caminho
    rápido;
  - **Sem WebGPU / sem placa nenhuma**: o **mesmo modelo** (GGUF `q4_k_m`, ~350MB) roda na
    **RAM/CPU do seu sistema** com o llama.cpp compilado em WebAssembly (`@wllama/wllama`,
    embutido em `js/vendor/wllama/`). Funciona em qualquer navegador moderno — sem flag,
    sem driver, sem instalar nada (CPU em passos lentos do modelo pequeno, mas joga direito).
- **O LLM não inventa lance**: o jogo manda pra ele o menu de candidatos que o MINIMAX já
  avaliou (com o score de cada um — capturar a última peça vale +100000) e ele escolhe UM —
  respondendo `{"i": <nº>, "motivo": "<frase em pt-BR>"}`. Resposta fora do menu, JSON torto
  ou falha de qualquer motor → uma segunda tentativa com o limite explícito e, se ainda assim
  falhar, **o minimax clássico assume** (o jogo nunca trava).
- **Modelos testados à mão**: o Qwen2.5-0.5B-Instruct (64,5 tok/s na GPU, JSON perfeito) e o
  SmolLM2-360M (mais leve) ficam disponíveis no painel; o Qwen3-0.6B foi testado e DESCARTADO
  (gasta tokens "pensando" e não obedece o JSON). O modo CPU usa o Qwen2.5-0.5B em GGUF
  (mesmo modelo, quantização compatível com o llama.cpp).
- **Quer velocidade máxima? (opcional)** — ative o WebGPU uma vez e ele fica pra sempre:
  1. abra `chrome://flags/#enable-unsafe-webgpu` (no Brave: `brave://flags/#enable-unsafe-webgpu`)
  2. ponha **Enabled** e clique em **Relaunch** (reabra o navegador)
  3. recarregue o jogo — pronto, o painel mostra a placa e o modelo carrega na GPU
  Sem isso, o modo LLM segue funcionando na RAM do seu sistema (é só mais lento).

## Como rodar

```bash
npm start          # sobe o servidor estático em http://localhost:3346
npm test           # 44 testes: regras + IA minimax + LLM (node --test)
```

**Jogue online agora**: https://francoscorporation.github.io/damas_ia/ — o jogo é 100% estático (servidor só serve arquivos). Para rodar local use `npm start` (abrir o index.html direto via file:// não carrega os módulos ES do navegador).

## Como foi testado

44 testes automatizados (node --test) cobrindo as regras, a IA e o modo LLM, todos passando:

- **Regras (11)**: 24 peças na posição inicial (só em casas escuras) · peão anda só na diagonal para frente · captura obrigatória (com captura disponível, só capturas são legais) · captura simples (pula e pousa além) · cadeia de captura dupla com promoção (d4×c5→b6×c7→d8 vira dama) · captura máxima obrigatória · promoção do peão · dama voadora (anda longe) · captura da dama (pula a vítima com casas vazias antes/depois) · vitória (sem peças ou sem lances) · o turno inverte
- **IA (8)**: lance legal da posição inicial · captura quando disponível · prefere a captura dupla sobre a simples · vence capturando a última peça · avaliação por material · escolheJogada com orçamento de tempo · profundidade 4 em menos de 5s · não shuffla em partida longa
- **Modos de dificuldade (1)**: fácil (raso + ruído) e difícil (3s) devolvem lance legal — o seletor agora troca o comportamento de verdade (antes FÁCIL/DIFÍCIL jogavam como médio: a chamada da IA ainda usava o antigo modo "impossível")
- **Modo LLM (24)**: prompt com tabuleiro compacto + candidatos + limites · notação a1-h8 · candidatos são SEMPRE lances legais (o LLM nunca recebe lance ilegal) · extração de JSON (puro, em ``` e com chave `}}` extra) · validação só aceita índice dentro do menu · retry na 2ª tentativa · fallback no minimax em qualquer falha · lance capturado do candidato aplica de verdade (captura dupla idêntica) · motor WebLLM sobe no browser e a jogada do modelo local aparece com motivo em pt-BR · seleção de motor (sem WebGPU → CPU na RAM do sistema · com placa → GPU · download que falha não é mascarado)

O bug de design encontrado pelos próprios testes: a flag de "peça capturada" era escrita numa string (impossível em JS) — corrigido com a remoção imediata da vítima no tabuleiro (o mesmo efeito das regras brasileiras: a capturada não bloqueia e não é recapturada).

## Estrutura

```
damas_ia/
├── index.html         # o jogo
├── style.css
├── server.js          # servidor estático (sem build)
├── js/
│   ├── damas-rules.js # regras: captura obrigatória e máxima, cadeia, dama voadora, promoção
│   ├── ai-minimax.js  # negamax com poda + iterative deepening + variedade + candidatos pro LLM
│   ├── llm.js         # modo LLM: prompt, validação de JSON, motor WebLLM, fallback
│   ├── vendor/
│   │   ├── webllm.esm.js  # WebLLM embutido (5,8MB) — caminho rápido (WebGPU), sem CDN
│   │   └── wllama/        # wllama embutido (index.js + wllama.wasm 8,1MB) — caminho CPU/RAM
│   └── app.js         # UI: click-move, destaque de capturas, placar, modos, painel do LLM
└── test/
    ├── damas-rules-test.mjs
    ├── ia-test.mjs
    └── llm-test.mjs
```

## Sobre a série

Este é o quarto jogo da série de jogos com IA: [Jogo da Velha](https://github.com/FrancosCorporation/jogo_da_velha_ia) → [Xadrez](https://github.com/FrancosCorporation/xadrez_ia) → [Futebol de Botão](https://github.com/FrancosCorporation/botao_ia) → Damas. Jogos clássicos no navegador, com IA rodando no browser, sem dependência externa e com testes provando as regras.

Código aberto: https://github.com/FrancosCorporation/damas_ia
