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
  | 'playerReleased';

export interface DiceRoll {
  d1: number;
  d2: number;
  total: number;
  isDouble: boolean;
}
