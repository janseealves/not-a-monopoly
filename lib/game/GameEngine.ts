import { Player } from "./Player";
import Board from "./Board";
import { STARTING_MONEY } from "../constants";
import { GameState, MoveResult, GameEventType } from "../types";

export class GameEngine {
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  round: number;
  private eventListeners: Map<GameEventType, ((data: any) => void)[]> = new Map();

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

  addEventListener(event: GameEventType, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: GameEventType, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: GameEventType, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  getCurrentPlayer(): Player | null {
    return this.players[this.currentPlayerIndex] ?? null;
  }

  nextTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentPlayerIndex === 0) this.round += 1;
  }

  moveCurrentPlayer(steps: number): MoveResult | null {
    const player = this.getCurrentPlayer();
    if (!player) return null;
    const from = player.position;
    player.move(steps, this.board.tiles.length);
    const to = player.position;
    const tile = this.board.getTile(to);

    const moveResult = {
      playerId: player.id,
      from,
      to,
      tile,
    };

    this.emit('playerMoved', moveResult);

    if (from > to && to !== 0) {
      this.emit('passGo', { playerId: player.id });
    }

    return moveResult;
  }

  buyProperty(playerId: string, propertyId: number): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    const property = this.board.getProperty(propertyId);
    if (!property || property.ownerId !== null) return false;

    if (player.money < property.price) return false;

    player.deductMoney(property.price);
    player.addProperty(propertyId);
    this.board.setPropertyOwner(propertyId, playerId);

    this.emit('propertyBought', {
      playerId,
      propertyId,
      propertyName: property.name,
      price: property.price,
      playerMoney: player.money
    });

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

    payer.deductMoney(rent);
    owner.addMoney(rent);

    this.emit('rentPaid', {
      payerId,
      ownerId: property.ownerId,
      propertyId,
      propertyName: property.name,
      rentAmount: rent,
      payerMoney: payer.money,
      ownerMoney: owner.money
    });

    return true;
  }
}

export default GameEngine;
