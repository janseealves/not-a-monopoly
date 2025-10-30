import { BOARD_SIZE } from "../constants";
import { BoardTile, Property, TileType } from "../types";

export class Board {
  tiles: BoardTile[];

  constructor() {
    this.tiles = this.createDefaultBoard();
  }

  createDefaultBoard(): BoardTile[] {
    const tiles: BoardTile[] = [
      // GO (Position 0)
      { position: 0, type: TileType.GO, name: "Go" },
      
      // Brown Properties (1, 3)
      { position: 1, type: TileType.PROPERTY, name: "Mediterranean Ave", property: { id: 1, name: "Mediterranean Ave", price: 60, rent: 2, color: "brown", ownerId: null } },
      { position: 2, type: TileType.COMMUNITY_CHEST, name: "Community Chest" },
      { position: 3, type: TileType.PROPERTY, name: "Baltic Ave", property: { id: 3, name: "Baltic Ave", price: 60, rent: 4, color: "brown", ownerId: null } },
      
      // Income Tax
      { position: 4, type: TileType.TAX, name: "Income Tax" },
      
      // Railroad
      { position: 5, type: TileType.PROPERTY, name: "Reading Railroad", property: { id: 5, name: "Reading Railroad", price: 200, rent: 25, color: "railroad", ownerId: null } },
      
      // Light Blue Properties (6, 8, 9)
      { position: 6, type: TileType.PROPERTY, name: "Oriental Ave", property: { id: 6, name: "Oriental Ave", price: 100, rent: 6, color: "lightblue", ownerId: null } },
      { position: 7, type: TileType.CHANCE, name: "Chance" },
      { position: 8, type: TileType.PROPERTY, name: "Vermont Ave", property: { id: 8, name: "Vermont Ave", price: 100, rent: 6, color: "lightblue", ownerId: null } },
      { position: 9, type: TileType.PROPERTY, name: "Connecticut Ave", property: { id: 9, name: "Connecticut Ave", price: 120, rent: 8, color: "lightblue", ownerId: null } },
      
      // JAIL (Position 10)
      { position: 10, type: TileType.JAIL, name: "Jail" },
      
      // Pink Properties (11, 13, 14)
      { position: 11, type: TileType.PROPERTY, name: "St. Charles Place", property: { id: 11, name: "St. Charles Place", price: 140, rent: 10, color: "pink", ownerId: null } },
      { position: 12, type: TileType.PROPERTY, name: "Electric Company", property: { id: 12, name: "Electric Company", price: 150, rent: 0, color: "utility", ownerId: null } },
      { position: 13, type: TileType.PROPERTY, name: "States Ave", property: { id: 13, name: "States Ave", price: 140, rent: 10, color: "pink", ownerId: null } },
      { position: 14, type: TileType.PROPERTY, name: "Virginia Ave", property: { id: 14, name: "Virginia Ave", price: 160, rent: 12, color: "pink", ownerId: null } },
      
      // Railroad
      { position: 15, type: TileType.PROPERTY, name: "Pennsylvania Railroad", property: { id: 15, name: "Pennsylvania Railroad", price: 200, rent: 25, color: "railroad", ownerId: null } },
      
      // Orange Properties (16, 18, 19)
      { position: 16, type: TileType.PROPERTY, name: "St. James Place", property: { id: 16, name: "St. James Place", price: 180, rent: 14, color: "orange", ownerId: null } },
      { position: 17, type: TileType.COMMUNITY_CHEST, name: "Community Chest" },
      { position: 18, type: TileType.PROPERTY, name: "Tennessee Ave", property: { id: 18, name: "Tennessee Ave", price: 180, rent: 14, color: "orange", ownerId: null } },
      { position: 19, type: TileType.PROPERTY, name: "New York Ave", property: { id: 19, name: "New York Ave", price: 200, rent: 16, color: "orange", ownerId: null } },
      
      // FREE PARKING (Position 20)
      { position: 20, type: TileType.FREE_PARKING, name: "Free Parking" },
      
      // Red Properties (21, 23, 24)
      { position: 21, type: TileType.PROPERTY, name: "Kentucky Ave", property: { id: 21, name: "Kentucky Ave", price: 220, rent: 18, color: "red", ownerId: null } },
      { position: 22, type: TileType.CHANCE, name: "Chance" },
      { position: 23, type: TileType.PROPERTY, name: "Indiana Ave", property: { id: 23, name: "Indiana Ave", price: 220, rent: 18, color: "red", ownerId: null } },
      { position: 24, type: TileType.PROPERTY, name: "Illinois Ave", property: { id: 24, name: "Illinois Ave", price: 240, rent: 20, color: "red", ownerId: null } },
      
      // Railroad
      { position: 25, type: TileType.PROPERTY, name: "B&O Railroad", property: { id: 25, name: "B&O Railroad", price: 200, rent: 25, color: "railroad", ownerId: null } },
      
      // Yellow Properties (26, 27, 29)
      { position: 26, type: TileType.PROPERTY, name: "Atlantic Ave", property: { id: 26, name: "Atlantic Ave", price: 260, rent: 22, color: "yellow", ownerId: null } },
      { position: 27, type: TileType.PROPERTY, name: "Ventnor Ave", property: { id: 27, name: "Ventnor Ave", price: 260, rent: 22, color: "yellow", ownerId: null } },
      { position: 28, type: TileType.PROPERTY, name: "Water Works", property: { id: 28, name: "Water Works", price: 150, rent: 0, color: "utility", ownerId: null } },
      { position: 29, type: TileType.PROPERTY, name: "Marvin Gardens", property: { id: 29, name: "Marvin Gardens", price: 280, rent: 24, color: "yellow", ownerId: null } },
      
      // GO TO JAIL (Position 30)
      { position: 30, type: TileType.GO_TO_JAIL, name: "Go To Jail" },
      
      // Green Properties (31, 32, 34)
      { position: 31, type: TileType.PROPERTY, name: "Pacific Ave", property: { id: 31, name: "Pacific Ave", price: 300, rent: 26, color: "green", ownerId: null } },
      { position: 32, type: TileType.PROPERTY, name: "North Carolina Ave", property: { id: 32, name: "North Carolina Ave", price: 300, rent: 26, color: "green", ownerId: null } },
      { position: 33, type: TileType.COMMUNITY_CHEST, name: "Community Chest" },
      { position: 34, type: TileType.PROPERTY, name: "Pennsylvania Ave", property: { id: 34, name: "Pennsylvania Ave", price: 320, rent: 28, color: "green", ownerId: null } },
      
      // Railroad
      { position: 35, type: TileType.PROPERTY, name: "Short Line", property: { id: 35, name: "Short Line", price: 200, rent: 25, color: "railroad", ownerId: null } },
      
      { position: 36, type: TileType.CHANCE, name: "Chance" },
      
      // Dark Blue Properties (37, 39)
      { position: 37, type: TileType.PROPERTY, name: "Park Place", property: { id: 37, name: "Park Place", price: 350, rent: 35, color: "darkblue", ownerId: null } },
      
      // Luxury Tax
      { position: 38, type: TileType.TAX, name: "Luxury Tax" },
      
      { position: 39, type: TileType.PROPERTY, name: "Boardwalk", property: { id: 39, name: "Boardwalk", price: 400, rent: 50, color: "darkblue", ownerId: null } },
    ];
    
    return tiles;
  }

  getTile(position: number): BoardTile {
    const pos = this.normalizePosition(position);
    return this.tiles[pos];
  }

  normalizePosition(position: number): number {
    return ((position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  }

  getProperty(propertyId: number): Property | null {
    const tile = this.tiles.find((t) => t.property?.id === propertyId);
    return tile?.property ?? null;
  }

  setPropertyOwner(propertyId: number, ownerId: string | null): void {
    const tile = this.tiles.find((t) => t.property?.id === propertyId);
    if (tile?.property) {
      tile.property.ownerId = ownerId;
    }
  }
}

export default Board;
