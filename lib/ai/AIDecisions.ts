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

    switch (strategy) {
      case AIStrategy.AGGRESSIVE:
        return true;

      case AIStrategy.CONSERVATIVE:
        return player.money > property.price * 3;

      case AIStrategy.BALANCED:
      default:
        return player.money > property.price * 1.5;
    }
  }
}