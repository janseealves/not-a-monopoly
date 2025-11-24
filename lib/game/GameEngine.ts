import { Player } from "./Player";
import Board from "./Board";
import { STARTING_MONEY } from "../constants";
import { GameState, MoveResult, GameEventType, DiceRoll, TileType } from "../types";

export class GameEngine {
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  round: number;
  private doubleRollCount: number = 0;
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
    this.doubleRollCount = 0;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentPlayerIndex === 0) this.round += 1;
  }

  processDoubleRoll(): boolean {
    this.doubleRollCount++;

    if (this.doubleRollCount >= 3) {
      const player = this.getCurrentPlayer();
      if (player) {
        this.sendToJail(player.id);
        this.emit('playerJailed', { playerId: player.id, reason: 'three_doubles' });
      }
      this.doubleRollCount = 0;
      return false;
    }

    return true;
  }

  sendToJail(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.inJail = true;
      player.position = 10;
      this.emit('playerJailed', { playerId, reason: 'sent_to_jail' });
    }
  }

  payBail(playerId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail || player.money < 50) {
      return false;
    }

    player.deductMoney(50);
    player.inJail = false;
    this.emit('bailPaid', { playerId, amount: 50, playerMoney: player.money });
    return true;
  }

  releaseFromJail(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.inJail) {
      player.inJail = false;
      this.emit('playerReleased', { playerId, reason: 'doubles_rolled' });
    }
  }

  attemptJailEscape(playerId: string): { escaped: boolean; diceRoll: DiceRoll } {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) {
      return { escaped: false, diceRoll: { d1: 0, d2: 0, total: 0, isDouble: false } };
    }

    const diceRoll = this.rollDice();

    if (diceRoll.isDouble) {
      this.releaseFromJail(playerId);
      const moveResult = this.moveCurrentPlayer(diceRoll.total);
      return { escaped: true, diceRoll };
    }

    return { escaped: false, diceRoll };
  }

  rollAndMove(): { diceRoll: DiceRoll; moveResult: MoveResult | null; continuesTurn: boolean; jailStatus?: string } {
    const player = this.getCurrentPlayer();
    if (!player) return { diceRoll: { d1: 0, d2: 0, total: 0, isDouble: false }, moveResult: null, continuesTurn: false };

    const diceRoll = this.rollDice();

    if (player.inJail) {
      if (diceRoll.isDouble) {
        this.releaseFromJail(player.id);
        const moveResult = this.moveCurrentPlayer(diceRoll.total);
        return { diceRoll, moveResult, continuesTurn: false, jailStatus: 'escaped' };
      } else {
        return { diceRoll, moveResult: null, continuesTurn: false, jailStatus: 'still_in_jail' };
      }
    }

    let continuesTurn = false;

    if (diceRoll.isDouble) {
      continuesTurn = this.processDoubleRoll();
      if (!continuesTurn) {
        return { diceRoll, moveResult: null, continuesTurn: false };
      }
    } else {
      this.doubleRollCount = 0;
    }

    const moveResult = this.moveCurrentPlayer(diceRoll.total);
    return { diceRoll, moveResult, continuesTurn: diceRoll.isDouble };
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

    if (tile.type === TileType.GO_TO_JAIL) {
      this.sendToJail(player.id);
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
