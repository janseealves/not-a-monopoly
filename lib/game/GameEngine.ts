import { Player } from "./Player";
import Board from "./Board";
import { Deck } from "./Deck";
import { STARTING_MONEY, PASS_GO_AMOUNT, INCOME_TAX_PERCENT, LUXURY_TAX_AMOUNT, BAIL_AMOUNT, MAX_HOUSES_PER_PROPERTY, MAX_HOTELS_PER_PROPERTY } from "../constants";
import { GameState, MoveResult, GameEventType, DiceRoll, BoardTile, TileType, Card, CardType } from "../types";

export class GameEngine {
  players: Player[];
  board: Board;
  currentPlayerIndex: number;
  round: number;
  private doubleRollCount: number = 0;
  private eventListeners: Map<GameEventType, ((data: any) => void)[]> = new Map();
  private chanceDeck: Deck;
  private communityChestDeck: Deck;

  constructor(playerNames: string[] = []) {
    this.players = playerNames.map((n, i) => new Player(String(i + 1), n, STARTING_MONEY));
    this.board = new Board();
    this.currentPlayerIndex = 0;
    this.round = 1;
    this.chanceDeck = new Deck(CardType.CHANCE);
    this.communityChestDeck = new Deck(CardType.COMMUNITY_CHEST);
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

    // Skip to next non-bankrupt player
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      if (this.currentPlayerIndex === 0) this.round += 1;
    } while (this.getCurrentPlayer()?.isBankrupt);
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

    // Check bankruptcy after tax payment
    if (player.money < 0) {
      console.log(`⚠️ ${player.name} cannot afford tax! Money: $${player.money}`);
      this.declareBankruptcy(player.id);
    }

    return taxAmount;
  }

  checkBankruptcy(playerId: string): boolean {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.isBankrupt) return false;

    return player.money < 0;
  }

  declareBankruptcy(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    console.log(`💀 ${player.name} is bankrupt!`);
    player.setBankrupt();

    // Transfer all properties back to bank (unowned)
    player.properties.forEach(propId => {
      this.board.setPropertyOwner(propId, null);
    });
    player.properties = [];

    this.emit('playerBankrupt', { playerId, playerName: player.name });

    // Check for winner
    this.checkWinCondition();
  }

  checkWinCondition(): void {
    const activePlayers = this.players.filter(p => !p.isBankrupt);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      console.log(`🏆 ${winner.name} wins the game!`);
      this.emit('gameWon', { playerId: winner.id, playerName: winner.name });
    }
  }

  getActivePlayers(): Player[] {
    return this.players.filter(p => !p.isBankrupt);
  }

  hasMonopoly(playerId: string, color: string): boolean {
    const colorProperties = this.board.tiles
      .filter(tile => tile.property?.color === color)
      .map(tile => tile.property!);

    return colorProperties.every(prop => prop.ownerId === playerId);
  }

  canBuyHouse(playerId: string, propertyId: number): boolean {
    const player = this.players.find(p => p.id === playerId);
    const property = this.board.getProperty(propertyId);

    if (!player || !property) return false;
    if (property.ownerId !== playerId) return false;
    if (!property.color || property.color === 'railroad' || property.color === 'utility') return false;
    if (property.hotels > 0) return false;
    if (property.houses >= MAX_HOUSES_PER_PROPERTY) return false;

    // Must have monopoly
    if (!this.hasMonopoly(playerId, property.color)) return false;

    // Must afford house cost
    if (player.money < (property.houseCost || 0)) return false;

    // Even building rule: can't build ahead of other properties in set
    const colorProperties = this.board.tiles
      .filter(tile => tile.property?.color === property.color && tile.property?.ownerId === playerId)
      .map(tile => tile.property!);

    const minHouses = Math.min(...colorProperties.map(p => p.houses));
    if (property.houses > minHouses) return false;

    return true;
  }

  buyHouse(playerId: string, propertyId: number): boolean {
    if (!this.canBuyHouse(playerId, propertyId)) return false;

    const player = this.players.find(p => p.id === playerId);
    const property = this.board.getProperty(propertyId);

    if (!player || !property || !property.houseCost) return false;

    const success = player.deductMoney(property.houseCost);
    if (!success) return false;

    property.houses++;

    console.log(`🏠 ${player.name} built house on ${property.name} (${property.houses} houses)`);

    this.emit('houseBought', {
      playerId,
      propertyId,
      propertyName: property.name,
      houses: property.houses,
      cost: property.houseCost
    });

    return true;
  }

  canBuyHotel(playerId: string, propertyId: number): boolean {
    const player = this.players.find(p => p.id === playerId);
    const property = this.board.getProperty(propertyId);

    if (!player || !property) return false;
    if (property.ownerId !== playerId) return false;
    if (property.houses !== MAX_HOUSES_PER_PROPERTY) return false;
    if (property.hotels > 0) return false;

    if (player.money < (property.hotelCost || 0)) return false;

    return true;
  }

  buyHotel(playerId: string, propertyId: number): boolean {
    if (!this.canBuyHotel(playerId, propertyId)) return false;

    const player = this.players.find(p => p.id === playerId);
    const property = this.board.getProperty(propertyId);

    if (!player || !property || !property.hotelCost) return false;

    const success = player.deductMoney(property.hotelCost);
    if (!success) return false;

    property.houses = 0;
    property.hotels = 1;

    console.log(`🏨 ${player.name} built hotel on ${property.name}`);

    this.emit('hotelBought', {
      playerId,
      propertyId,
      propertyName: property.name,
      cost: property.hotelCost
    });

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

    // Calculate rent based on improvements
    if (property.hotels > 0 && property.rentWithHouses) {
      rent = property.rentWithHouses[4]; // Hotel rent
      console.log(`🏨 Hotel rent: $${rent}`);
    } else if (property.houses > 0 && property.rentWithHouses) {
      rent = property.rentWithHouses[property.houses - 1];
      console.log(`🏠 Rent with ${property.houses} houses: $${rent}`);
    } else if (property.color && property.color !== 'railroad' && property.color !== 'utility') {
      // Monopoly without improvements = double rent
      if (this.hasMonopoly(property.ownerId!, property.color)) {
        rent = property.rent * 2;
        console.log(`🎯 Monopoly rent (doubled): $${rent}`);
      }
    }

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

    // Check bankruptcy after rent payment
    if (payer.money < 0) {
      console.log(`⚠️ ${payer.name} cannot afford rent! Money: $${payer.money}`);
      this.declareBankruptcy(payer.id);
    }

    return true;
  }

  drawCard(type: CardType): Card | null {
    const deck = type === CardType.CHANCE ? this.chanceDeck : this.communityChestDeck;
    return deck.draw();
  }

  resolveCardAction(playerId: string, card: Card): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    console.log(`📋 ${player.name} drew: ${card.description}`);

    // Emit event for UI to show card
    this.emit('cardDrawn', { playerId, card });

    switch (card.action.type) {
      case 'MOVE_TO': {
        if (card.action.type === 'MOVE_TO') {
          // Move player to position
          const moveToAction = card.action;
          const oldPos = player.position;
          player.setPosition(moveToAction.position);

          // Check if passed GO (went backwards on the board means passing GO)
          if (oldPos > player.position) {
            player.addMoney(PASS_GO_AMOUNT);
            console.log(`💰 ${player.name} passed GO and collected $${PASS_GO_AMOUNT}!`);
          }
        }
        break;
      }

      case 'MOVE_RELATIVE': {
        if (card.action.type === 'MOVE_RELATIVE') {
          // Move forward or back relative steps
          const moveRelativeAction = card.action;
          player.move(moveRelativeAction.steps, this.board.tiles.length);
        }
        break;
      }

      case 'PAY': {
        if (card.action.type === 'PAY') {
          const payAction = card.action;
          player.money -= payAction.amount;
          console.log(`💸 ${player.name} paid $${payAction.amount}`);
          if (player.money < 0) {
            this.declareBankruptcy(playerId);
          }
        }
        break;
      }

      case 'COLLECT': {
        if (card.action.type === 'COLLECT') {
          const collectAction = card.action;
          player.addMoney(collectAction.amount);
          console.log(`💰 ${player.name} collected $${collectAction.amount}`);
        }
        break;
      }

      case 'PAY_PER_HOUSE': {
        let totalRepairs = 0;
        if (card.action.type === 'PAY_PER_HOUSE') {
          const payPerHouseAction = card.action;
          player.properties.forEach(propId => {
            const prop = this.board.getProperty(propId);
            if (prop) {
              totalRepairs += prop.houses * payPerHouseAction.houseAmount;
              totalRepairs += prop.hotels * payPerHouseAction.hotelAmount;
            }
          });
        }
        player.money -= totalRepairs;
        console.log(`🔨 ${player.name} paid $${totalRepairs} for repairs`);
        if (player.money < 0) {
          this.declareBankruptcy(playerId);
        }
        break;
      }

      case 'COLLECT_FROM_PLAYERS': {
        // Collect from all other active players
        if (card.action.type === 'COLLECT_FROM_PLAYERS') {
          const collectFromPlayersAction = card.action;
          this.players.forEach(p => {
            if (p.id !== playerId && !p.isBankrupt) {
              p.money -= collectFromPlayersAction.amount;
              player.addMoney(collectFromPlayersAction.amount);
              console.log(`💰 ${player.name} collected $${collectFromPlayersAction.amount} from ${p.name}`);
              if (p.money < 0) {
                this.declareBankruptcy(p.id);
              }
            }
          });
        }
        break;
      }

      case 'PAY_TO_PLAYERS': {
        // Pay to all other active players
        if (card.action.type === 'PAY_TO_PLAYERS') {
          const payToPlayersAction = card.action;
          this.players.forEach(p => {
            if (p.id !== playerId && !p.isBankrupt) {
              player.money -= payToPlayersAction.amount;
              p.addMoney(payToPlayersAction.amount);
              console.log(`💸 ${player.name} paid $${payToPlayersAction.amount} to ${p.name}`);
            }
          });
        }
        if (player.money < 0) {
          this.declareBankruptcy(playerId);
        }
        break;
      }

      case 'GET_OUT_OF_JAIL_FREE':
        player.getOutOfJailFreeCards++;
        console.log(`🎫 ${player.name} received a Get Out of Jail Free card!`);
        break;

      case 'GO_TO_JAIL':
        this.sendToJail(playerId);
        break;

      case 'GO_BACK': {
        if (card.action.type === 'GO_BACK') {
          // Go back N spaces
          const goBackAction = card.action;
          player.move(-goBackAction.spaces, this.board.tiles.length);
          console.log(`⬅️ ${player.name} went back ${goBackAction.spaces} spaces`);
        }
        break;
      }
    }
  }
}

export default GameEngine;
