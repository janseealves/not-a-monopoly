import { Player as IPlayer } from "../types";

export class Player implements IPlayer {
  id: string;
  name: string;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;

  constructor(id: string, name: string, startingMoney: number) {
    this.id = id;
    this.name = name;
    this.money = startingMoney;
    this.position = 0;
    this.properties = [];
    this.inJail = false;
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  deductMoney(amount: number): boolean {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  isBankrupt(): boolean {
    return this.money < 0;
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
}

export default Player;
