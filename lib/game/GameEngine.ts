import { Player } from "./Player";
import Board from "./Board";
import { STARTING_MONEY, PASS_GO_AMOUNT, INCOME_TAX_PERCENT, LUXURY_TAX_AMOUNT, BAIL_AMOUNT } from "../constants";
import { GameState, MoveResult, GameEventType, DiceRoll, BoardTile, TileType } from "../types";

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
    // Reset consecutive doubles count when changing player
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer) {
      currentPlayer.consecutiveDoublesCount = 0;
    }

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
      console.log(`🚔 ${player.name} foi para a prisão!`);
      player.position = 10; // JAIL position
      player.inJail = true;
      player.jailTurns = 0;
      player.consecutiveDoublesCount = 0;
      this.emit('playerJailed', { playerId, reason: 'sent_to_jail' });
    }
  }

  payBail(playerId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) return false;

    if (player.money < BAIL_AMOUNT) {
      console.log(`${player.name} não pode pagar a fiança ($${BAIL_AMOUNT})`);
      return false;
    }

    const success = player.deductMoney(BAIL_AMOUNT);
    if (success) {
      this.releaseFromJail(playerId);
      console.log(`${player.name} pagou $${BAIL_AMOUNT} de fiança e saiu da prisão!`);
    }
    this.emit('bailPaid', { playerId, amount: BAIL_AMOUNT, playerMoney: player.money });
    return success;
  }

  releaseFromJail(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    console.log(`🔓 ${player.name} saiu da prisão!`);
    player.inJail = false;
    player.jailTurns = 0;
    this.emit('playerReleased', { playerId, reason: 'doubles_rolled' });
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

    const moveResult = {
      playerId: player.id,
      from,
      to,
      tile,
      passedGo,
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

    if (player.money < property.price) {
      console.log(`${player.name} cannot afford ${property.name} ($${property.price})`);
      return false;
    }

    const success = player.deductMoney(property.price);
    if (!success) return false;

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

    player.money -= taxAmount; // Deduct tax directly (allow negative)
    return taxAmount;
  }

  payRent(payerId: string, propertyId: number, diceTotal?: number): boolean {
    const payer = this.players.find((p) => p.id === payerId);
    const property = this.board.getProperty(propertyId);

    if (!payer || !property || !property.ownerId) return false;
    if (property.ownerId === payerId) return false; // Não paga para si mesmo

    const owner = this.players.find((p) => p.id === property.ownerId);
    if (!owner) return false;

    let rent = property.rent;

    // Calculate railroad rent based on number owned
    if (property.color === "railroad") {
      const ownerRailroads = owner.properties.filter(propId => {
        const prop = this.board.getProperty(propId);
        return prop?.color === "railroad";
      }).length;

      // Standard Monopoly railroad rent: 25, 50, 100, 200
      const railroadRents = [25, 50, 100, 200];
      rent = railroadRents[ownerRailroads - 1] || 25;

      console.log(`🚂 Railroad rent: ${ownerRailroads} owned = $${rent}`);
    }

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
    payer.money -= rent; // Deduct rent directly (allow negative)
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
