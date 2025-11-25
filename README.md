# Not-a-Monopoly

Um jogo similar ao Monopoly implementado em TypeScript com Next.js e React.

**🎮 Jogue agora:** https://not-a-monopoly-6coc.vercel.app/

## Regras do Jogo

### Objetivo
Seja o último jogador que não faliu comprando, alugando e desenvolvendo propriedades.

### Como Jogar
1. **Movimento**: Role 2 dados para se mover pelo tabuleiro
2. **Propriedades**: Compre propriedades desocupadas onde parar
3. **Aluguel**: Pague aluguel quando parar em propriedades de outros jogadores
4. **Desenvolvimento**: Construa casas e hotéis em conjuntos de cor completos (monopólios)
5. **Cartas**: Pegue cartas Chance ou Community Chest quando parar nessas casas
6. **Prisão**: Pode ser enviado à prisão por várias razões, escape rolando dados duplos ou pagando fiança
7. **Impostos**: Pague Income Tax (10% do patrimônio ou $200) e Luxury Tax ($75)

### Mecânicas Implementadas
- ✅ Movimento de jogadores com dados
- ✅ Compra de propriedades
- ✅ Sistema de aluguel (incluindo monopólios, ferrovias, utilities)
- ✅ Construção de casas e hotéis
- ✅ Sistema de prisão completo (ir, escapar, pagar fiança)
- ✅ Cartas Chance e Community Chest
- ✅ Sistema de falência
- ✅ Passagem por GO ($200)
- ✅ Impostos (Income Tax e Luxury Tax)
- ✅ Condição de vitória
- ✅ IA para jogadores automatizados

### Funcionalidades Planejadas para Futuras Versões

- **Leilões**: Sistema de leilão para propriedades não compradas
- **Hipotecas**: Permitir hipotecar propriedades para obter dinheiro
- **Negociações**: Sistema de trocas e negociações entre jogadores
- **Free Parking**: Acúmulo de dinheiro no Free Parking
- **Regras customizadas**: Opções para variações locais do jogo

## Estrutura do Projeto

```
lib/
├── game/
│   ├── GameEngine.ts    # Motor principal do jogo
│   ├── Board.ts         # Tabuleiro e propriedades
│   ├── Player.ts        # Lógica dos jogadores
│   └── Deck.ts          # Cartas Chance/Community Chest
├── ai/
│   ├── SimpleAI.ts      # IA básica
│   ├── MediumAI.ts      # IA intermediária
│   └── GameFlowManager.ts # Gerenciamento automático
├── types.ts             # Definições de tipos
└── constants.ts         # Constantes do jogo

app/
└── components/          # Componentes React da UI
```

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` para desenvolvimento local.
