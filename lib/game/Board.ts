import { BOARD_SIZE } from "../constants";
import { BoardTile, Property, TileType } from "../types";

export class Board {
  tiles: BoardTile[];

  constructor() {
    this.tiles = this.createDefaultBoard();
  }

  createDefaultBoard(): BoardTile[] {
    const tiles: BoardTile[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const tile: BoardTile = {
        position: i,
        type: TileType.OTHER,
        name: `Tile ${i}`,
      };

      if (i === 0) {
        tile.type = TileType.GO;
        tile.name = "Go";
      }
      tiles.push(tile);
    }
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
    const tile = this.tiles.find((t) => t.property && t.property.id === propertyId);
    return tile?.property ?? null;
  }

  setPropertyOwner(propertyId: number, ownerId: string | null): void {
    const tile = this.tiles.find((t) => t.property && t.property.id === propertyId);
    if (tile && tile.property) {
      tile.property.ownerId = ownerId;
    }
  }
}

export default Board;
