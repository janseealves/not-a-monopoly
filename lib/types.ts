export type PlayerId = string;

export interface DiceRoll {
  d1: number;
  d2: number;
  total: number;
  isDouble: boolean;
}

export enum TileType {
  GO = "GO",
  PROPERTY = "PROPERTY",
  TAX = "TAX",
  JAIL = "JAIL",
  CHANCE = "CHANCE",
  COMMUNITY_CHEST = "COMMUNITY_CHEST",
  FREE_PARKING = "FREE_PARKING",
  GO_TO_JAIL = "GO_TO_JAIL",
  OTHER = "OTHER",
}

export interface Property {
  id: number;
  name: string;
  price: number;
  rent: number;
  color?: string;
  ownerId: PlayerId | null;
  houses: number;
  hotels: number;
  houseCost?: number;
  hotelCost?: number;
  rentWithHouses?: number[];
}

export interface BoardTile {
  position: number;
  type: TileType;
  name: string;
  property?: Property;
}

export interface Player {
  id: PlayerId;
  name: string;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  consecutiveDoublesCount: number;
  isBankrupt: boolean;
  getOutOfJailFreeCards: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  round: number;
}

export interface MoveResult {
  playerId: PlayerId;
  from: number;
  to: number;
  tile: BoardTile;
  passedGo?: boolean;
}

export interface GameEvent {
  type: string;
  data: any;
}

export type GameEventType =
  | 'playerMoved'
  | 'rentPaid'
  | 'propertyBought'
  | 'playerJailed'
  | 'turnStarted'
  | 'turnEnded'
  | 'playerBankrupt'
  | 'passGo'
  | 'bailPaid'
  | 'playerReleased'
  | 'gameWon'
  | 'houseBought'
  | 'hotelBought'
  | 'cardDrawn';

export enum CardType {
  CHANCE = "CHANCE",
  COMMUNITY_CHEST = "COMMUNITY_CHEST"
}

export type CardAction =
  | { type: 'MOVE_TO'; position: number }
  | { type: 'MOVE_RELATIVE'; steps: number }
  | { type: 'PAY'; amount: number }
  | { type: 'COLLECT'; amount: number }
  | { type: 'PAY_PER_HOUSE'; houseAmount: number; hotelAmount: number }
  | { type: 'COLLECT_FROM_PLAYERS'; amount: number }
  | { type: 'PAY_TO_PLAYERS'; amount: number }
  | { type: 'GET_OUT_OF_JAIL_FREE' }
  | { type: 'GO_TO_JAIL' }
  | { type: 'GO_BACK'; spaces: number };

export interface Card {
  id: number;
  type: CardType;
  description: string;
  action: CardAction;
}
