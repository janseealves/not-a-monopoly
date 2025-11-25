import { GameEngine } from "../game";
import { Player, Property, BoardTile, TileType } from "../types";
import { AIDecisions, AIStrategy } from "./AIDecisions";

export class SimpleAI {
  protected strategy: AIStrategy = AIStrategy.CONSERVATIVE;

  constructor(strategy?: AIStrategy) {
    if (strategy) {
      this.strategy = strategy;
    }
  }

  public shouldBuyProperty(property: Property, player: Player): boolean {
    return AIDecisions.shouldBuyProperty(player, property, this.strategy);
  }

  public shouldPayBail(player: Player): boolean {
    return AIDecisions.shouldPayBailDecision(player, this.strategy);
  }

  public shouldStayInJail(player: Player): boolean {
    return AIDecisions.evaluateJailStay(player);
  }

  protected handleLanding(
    game: GameEngine,
    player: Player,
    tile: BoardTile,
    rollAmount: number
  ): void {
    switch (tile.type) {
      case TileType.PROPERTY:
        const property = tile.property; 
        if (property) {
          this.decideToBuyOrPay(game, player, property, rollAmount);
        }
        break;
      
      case TileType.TAX:
        console.log(`[AI ${player.name}] pagando imposto em ${tile.name}`);
        //game.payTax(player, tile.cost);
        break;
      
      case TileType.GO_TO_JAIL: 
      case TileType.CHANCE: 
      case TileType.COMMUNITY_CHEST: 
        console.log(`[AI ${player.name}] caiu em ${tile.name}`);
        //game.handleSpecialTile(player, tile);
        break;
    }
  }

  protected decideToBuyOrPay(
    game: GameEngine,
    player: Player,
    property: Property,
    rollAmount: number
  ): void {
    if (!property.ownerId) {
      this.decideToBuyProperty(game, player, property);
    } else if (property.ownerId !== player.id) {
      console.log(`[AI ${player.name}] pagando aluguel em ${property.name}`);
      game.payRent(player.id, property.id);
    }
  }

  protected decideToBuyProperty(
    game: GameEngine,
    player: Player,
    property: Property
  ): void {
    if (AIDecisions.shouldBuyProperty(player, property, this.strategy)) {
      console.log(`[AI ${player.name}] decidiu comprar ${property.name} por $${property.price}`);
      const success = game.buyProperty(player.id, property.id);
      if (success) {
        console.log(`[AI ${player.name}] comprou ${property.name}!`);
      } else {
        console.log(`[AI ${player.name}] falhou ao comprar ${property.name}`);
      }
    } else {
      console.log(`[AI ${player.name}] decidiu NÃO comprar ${property.name}`);
    }
  }
}