import { Player } from "./Player";
import Board from "./Board";
import { STARTING_MONEY, PASS_GO_AMOUNT, INCOME_TAX_PERCENT, LUXURY_TAX_AMOUNT, BAIL_AMOUNT, MAX_JAIL_TURNS } from "../constants";
import { GameState, MoveResult, DiceRoll, BoardTile, TileType } from "../types";

export class GameEngine {
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  round: number;

  constructor(playerNames: string[] = []) {
    this.players = playerNames.map((n, i) => new Player(String(i + 1), n, STARTING_MONEY));
    this.board = new Board();
    this.currentPlayerIndex = 0;
    this.round = 1;
  }

  getGameState(): GameState {
    return {
      players: this.players.map((p) => ({ ...p })),
      currentPlayerIndex: this.currentPlayerIndex,
      round: this.round,
    };
  }

  rollDice(): DiceRoll {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const isDouble = d1 === d2;
    return { d1, d2, total, isDouble };
  }

  getCurrentPlayer(): Player | null {
    return this.players[this.currentPlayerIndex] ?? null;
  }

  nextTurn(): void {
    // Reset consecutive doubles count when changing player
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer) {
      currentPlayer.consecutiveDoublesCount = 0;
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentPlayerIndex === 0) this.round += 1;
  }

  sendToJail(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    console.log(`🚔 ${player.name} foi para a prisão!`);
    player.position = 10; // JAIL position
    player.inJail = true;
    player.jailTurns = 0;
    player.consecutiveDoublesCount = 0;
  }

  releaseFromJail(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    console.log(`🔓 ${player.name} saiu da prisão!`);
    player.inJail = false;
    player.jailTurns = 0;
  }

  payBail(playerId: string): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || !player.inJail) return false;

    if (!player.canAfford(BAIL_AMOUNT)) {
      console.log(`${player.name} não pode pagar a fiança ($${BAIL_AMOUNT})`);
      return false;
    }

    const success = player.deductMoney(BAIL_AMOUNT);
    if (success) {
      this.releaseFromJail(playerId);
      console.log(`${player.name} pagou $${BAIL_AMOUNT} de fiança e saiu da prisão!`);
    }
    return success;
  }

  moveCurrentPlayer(steps: number): MoveResult | null {
    const player = this.getCurrentPlayer();
    if (!player) return null;

    // Cannot move if in jail
    if (player.inJail) {
      console.log(`${player.name} is in jail and cannot move!`);
      return null;
    }

    const from = player.position;
    player.move(steps, this.board.tiles.length);
    const to = player.position;

    // Check if player passed GO (wrapped around the board)
    const passedGo = from + steps >= this.board.tiles.length;
    if (passedGo) {
      player.addMoney(PASS_GO_AMOUNT);
      console.log(`💰 ${player.name} passou por GO e recebeu $${PASS_GO_AMOUNT}!`);
    }

    const tile = this.board.getTile(to);
    return {
      playerId: player.id,
      from,
      to,
      tile,
      passedGo,
    };
  }

  applyTax(player: Player, tile: BoardTile, payTenPercent?: boolean): number {
    if (tile.type !== TileType.TAX) return 0;

    let taxAmount = 0;

    if (tile.name === "Income Tax") {
      // Income Tax: player chooses 10% of total worth OR $200
      const totalWorth = player.money + player.properties.reduce((sum, propId) => {
        const prop = this.board.getProperty(propId);
        return sum + (prop?.price ?? 0);
      }, 0);

      const tenPercentAmount = Math.floor(totalWorth * INCOME_TAX_PERCENT);
      const fixedAmount = 200;

      // payTenPercent parameter indicates player's choice
      taxAmount = payTenPercent ? tenPercentAmount : fixedAmount;

      console.log(`💸 ${player.name} paid Income Tax: $${taxAmount} (chose ${payTenPercent ? '10%' : '$200'})`);
    } else if (tile.name === "Luxury Tax") {
      // Luxury Tax: fixed $75
      taxAmount = LUXURY_TAX_AMOUNT;
      console.log(`💸 ${player.name} paid Luxury Tax: $${taxAmount}`);
    }

    player.deductMoney(taxAmount, { allowNegative: true });
    return taxAmount;
  }

  buyProperty(playerId: string, propertyId: number): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    const property = this.board.getProperty(propertyId);
    if (!property || property.ownerId !== null) return false;

    if (!player.canAfford(property.price)) {
      console.log(`${player.name} cannot afford ${property.name} ($${property.price})`);
      return false;
    }

    const success = player.deductMoney(property.price);
    if (!success) return false;

    player.addProperty(propertyId);
    this.board.setPropertyOwner(propertyId, playerId);

    return true;
  }

  payRent(payerId: string, propertyId: number, diceTotal?: number): boolean {
    const payer = this.players.find((p) => p.id === payerId);
    const property = this.board.getProperty(propertyId);

    if (!payer || !property || !property.ownerId) return false;
    if (property.ownerId === payerId) return false; // Não paga para si mesmo

    const owner = this.players.find((p) => p.id === property.ownerId);
    if (!owner) return false;

    let rent = property.rent;

    // Calculate utility rent based on dice roll
    if (property.color === "utility" && diceTotal) {
      // Count how many utilities the owner has
      const ownerUtilities = owner.properties.filter(propId => {
        const prop = this.board.getProperty(propId);
        return prop?.color === "utility";
      }).length;

      // 1 utility: 4x dice roll, 2 utilities: 10x dice roll
      const multiplier = ownerUtilities === 2 ? 10 : 4;
      rent = diceTotal * multiplier;
      console.log(`💸 Utility rent: ${diceTotal} × ${multiplier} = $${rent} (owner has ${ownerUtilities} utilities)`);
    }

    // Allow negative for rent (bankruptcy handling can come later)
    const success = payer.deductMoney(rent, { allowNegative: true });
    if (success) {
      owner.addMoney(rent);
    }

    return success;
  }
}

export default GameEngine;
