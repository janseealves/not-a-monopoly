import { Player } from "./Player";
import Board from "./Board";
import { STARTING_MONEY, PASS_GO_AMOUNT } from "../constants";
import { GameState, MoveResult, DiceRoll } from "../types";

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

  moveCurrentPlayer(steps: number): MoveResult | null {
    const player = this.getCurrentPlayer();
    if (!player) return null;
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

  payRent(payerId: string, propertyId: number): boolean {
    const payer = this.players.find((p) => p.id === payerId);
    const property = this.board.getProperty(propertyId);

    if (!payer || !property || !property.ownerId) return false;
    if (property.ownerId === payerId) return false; // Não paga para si mesmo

    const owner = this.players.find((p) => p.id === property.ownerId);
    if (!owner) return false;

    const rent = property.rent;

    // Allow negative for rent (bankruptcy handling can come later)
    const success = payer.deductMoney(rent, { allowNegative: true });
    if (success) {
      owner.addMoney(rent);
    }

    return success;
  }
}

export default GameEngine;
