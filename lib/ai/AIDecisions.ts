import { Player, Property } from "../types";
import { Board } from "../game";

export enum AIStrategy {
  AGGRESSIVE = "aggressive",
  CONSERVATIVE = "conservative",
  BALANCED = "balanced",
}

export class AIDecisions {
  static shouldBuyProperty(
    player: Player,
    property: Property,
    strategy: AIStrategy
  ): boolean {
    if (player.money < property.price) {
      return false;
    }

    const baseRequirement = this.getBaseMoneyRequirement(strategy);
    const hasMinimumFunds = player.money > property.price * baseRequirement;

    if (!hasMinimumFunds) return false;

    const colorGroupBonus = this.calculateColorGroupBonus(player, property);
    const utilityValue = this.evaluateUtilityValue(property);
    const railroadValue = this.evaluateRailroadValue(player, property);

    const totalValue = colorGroupBonus + utilityValue + railroadValue;

    return totalValue >= this.getDecisionThreshold(strategy);
  }

  static shouldPayBailDecision(player: Player, strategy: AIStrategy): boolean {
    const bailCost = 50;

    if (player.money < bailCost) return false;

    switch (strategy) {
      case AIStrategy.AGGRESSIVE:
        return player.money >= bailCost * 2;

      case AIStrategy.CONSERVATIVE:
        return player.money >= bailCost * 4 && player.properties.length >= 3;

      case AIStrategy.BALANCED:
      default:
        return player.money >= bailCost * 3;
    }
  }

  static evaluateJailStay(player: Player): boolean {
    const turnsBenefit = player.properties.length * 0.1;
    const moneyPressure = player.money < 200 ? 0.3 : 0;

    return (turnsBenefit + moneyPressure) > 0.4;
  }

  private static getBaseMoneyRequirement(strategy: AIStrategy): number {
    switch (strategy) {
      case AIStrategy.AGGRESSIVE: return 1.2;
      case AIStrategy.CONSERVATIVE: return 3.0;
      case AIStrategy.BALANCED: return 1.8;
      default: return 1.5;
    }
  }

  private static calculateColorGroupBonus(player: Player, property: Property): number {
    if (!property.color) return 0.3;

    const sameColorOwned = this.countSameColorProperties(player, property.color);
    const totalInGroup = this.getColorGroupSize(property.color);

    if (sameColorOwned === totalInGroup - 1) {
      return 0.8;
    }

    return Math.min(sameColorOwned * 0.2 + 0.3, 0.7);
  }

  private static evaluateUtilityValue(property: Property): number {
    return property.name.toLowerCase().includes('utility') ? 0.4 : 0;
  }

  private static evaluateRailroadValue(player: Player, property: Property): number {
    if (property.color !== 'railroad') return 0;

    // Count how many railroads player already owns
    // Railroad IDs from Board.ts: positions 5, 15, 25, 35
    const railroadIds = [5, 15, 25, 35];
    const railroadsOwned = player.properties.filter(id => railroadIds.includes(id)).length;

    return Math.min(railroadsOwned * 0.15 + 0.4, 0.6);
  }

  private static getDecisionThreshold(strategy: AIStrategy): number {
    switch (strategy) {
      case AIStrategy.AGGRESSIVE: return 0.3;
      case AIStrategy.CONSERVATIVE: return 0.7;
      case AIStrategy.BALANCED: return 0.5;
      default: return 0.5;
    }
  }

  private static countSameColorProperties(player: Player, color: string): number {
    return 0;
  }

  private static getColorGroupSize(color: string): number {
    const colorGroupSizes: { [key: string]: number } = {
      'brown': 2, 'lightblue': 3, 'pink': 3, 'orange': 3,
      'red': 3, 'yellow': 3, 'green': 3, 'darkblue': 2
    };
    return colorGroupSizes[color] || 3;
  }
}