import { Player as IPlayer } from "../types";

export class Player implements IPlayer {
  id: string;
  name: string;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  consecutiveDoublesCount: number;
  isBankrupt: boolean;
  getOutOfJailFreeCards: number;

  constructor(id: string, name: string, startingMoney: number) {
    this.id = id;
    this.name = name;
    this.money = startingMoney;
    this.position = 0;
    this.properties = [];
    this.inJail = false;
    this.jailTurns = 0;
    this.consecutiveDoublesCount = 0;
    this.isBankrupt = false;
    this.getOutOfJailFreeCards = 0;
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  canAfford(amount: number): boolean {
    return this.money >= amount;
  }

  deductMoney(amount: number, options?: { allowNegative?: boolean }): boolean {
    const allowNegative = options?.allowNegative ?? false;

    if (!allowNegative && this.money < amount) {
      console.warn(`${this.name} cannot afford $${amount} (has $${this.money})`);
      return false;
    }

    this.money -= amount;
    return true;
  }

  addProperty(propertyId: number): void {
    if (!this.properties.includes(propertyId)) {
      this.properties.push(propertyId);
    }
  }

  move(steps: number, boardSize: number): void {
    const next = (this.position + steps) % boardSize;
    this.position = next;
  }

  setPosition(pos: number): void {
    this.position = pos % 40;
  }

  setBankrupt(): void {
    this.isBankrupt = true;
  }
}

export default Player;
