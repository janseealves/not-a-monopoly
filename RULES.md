# Regras do Monopoly — Versão inicial

Este documento contém a versão inicial (texto fornecido pelo usuário) das regras que serão utilizadas como referência durante o desenvolvimento do motor do jogo.

---

O Monopoly é um jogo de estratégia e sorte no qual os jogadores concorrem para adquirir propriedades, coletar renda e levar os adversários à falência. Em cada rodada, os jogadores rolam um dado para determinar quais casas visitam, podendo adquirir imóveis, pagar impostos, realizar taxas e muito mais.

Preparação do Jogo

- Número de jogadores: 2 a 8.
- Cada jogador escolhe um marcador e o posiciona em "Go".
- A ordem dos jogadores é determinada aleatoriamente.

Rodadas do Jogo

- Em cada rodada, o jogador atual lança o(s) dado(s) e move seu marcador.
- Ao cair em uma casa, o jogador realiza a ação correspondente (comprar propriedade, pagar aluguel, pagar imposto, etc.).

Compra e Propriedades

- Se o jogador cair em uma propriedade sem dono, pode comprá-la pagando o preço indicado.
- Se possuir todas as propriedades de uma cor, pode cobrar valores de aluguel maiores.

Impostos e Taxas (regras iniciais)

- Imposto de 200: cada vez que o jogador rolar 6, paga R$200.
- Imposto de 10%: em algumas casas (ex.: casas de alta renda) paga-se 10% do valor.
- Regras adicionais citadas (1.500 / 2.000 / piso de renda) serão refinadas para regras jogáveis durante iterações.

Falência

- Se um jogador não conseguir pagar suas dívidas, será declarado falido e sai do jogo.

Fim de Jogo

- O jogo termina quando apenas um jogador permanece solvente ou quando um critério combinado entre os jogadores for atingido.

---

Observação: Este arquivo serve como referência inicial — regras conflitantes ou pouco claras do texto original foram simplificadas; iremos detalhar e formalizar as regras (aluguel, compra, impostos específicos, casas especiais) nas próximas iterações.
