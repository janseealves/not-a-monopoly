import { SimpleAI } from "./SimpleAI";
import { AIStrategy, AIDecisions } from "./AIDecisions";
import { Property, Player } from "../types";

export class MediumAI extends SimpleAI {
  constructor() {
    super(AIStrategy.AGGRESSIVE);
  }

  public shouldBuyProperty(property: Property, player: Player): boolean {
    const basicDecision = AIDecisions.shouldBuyProperty(player, property, this.strategy);

    if (!basicDecision) return false;

    const reserveAmount = this.calculateReserveAmount(player);
    if (player.money - property.price < reserveAmount) {
      return false;
    }

    const colorGroupValue = this.evaluateColorGroup(property, player);
    return colorGroupValue > 0.6;
  }

  public shouldPayBail(player: Player): boolean {
    const basicDecision = AIDecisions.shouldPayBailDecision(player, this.strategy);

    if (!basicDecision) return false;

    const reserveRatio = player.money / 50;
    const hasGoodPortfolio = player.properties.length > 5;
    const isEarlyGame = player.properties.length < 3;

    if (isEarlyGame) return reserveRatio >= 4;

    return reserveRatio >= 2.5 || hasGoodPortfolio;
  }

  public shouldStayInJail(player: Player): boolean {
    const baseStay = AIDecisions.evaluateJailStay(player);
    const lateGameBenefit = player.properties.length > 6 ? 0.2 : 0;

    return baseStay || lateGameBenefit > 0.15;
  }

  private calculateReserveAmount(player: Player): number {
    const baseReserve = 200;
    const propertyCount = player.properties.length;
    return Math.max(baseReserve - (propertyCount * 30), 50);
  }

  private evaluateColorGroup(property: Property, player: Player): number {
    if (!property.color) return 0.5;

    const ownedInColorGroup = player.properties.filter(propId => {
      return true;
    }).length;

    const totalInColorGroup = this.getColorGroupSize(property.color);
    const completionRatio = ownedInColorGroup / totalInColorGroup;

    return Math.min(completionRatio + 0.3, 1.0);
  }

  private getColorGroupSize(color: string): number {
    const colorGroupSizes: { [key: string]: number } = {
      'brown': 2, 'lightblue': 3, 'pink': 3, 'orange': 3,
      'red': 3, 'yellow': 3, 'green': 3, 'darkblue': 2
    };
    return colorGroupSizes[color] || 3;
  }
}