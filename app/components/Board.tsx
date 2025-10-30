import { GameState } from '@/lib/types';

interface BoardProps {
  gameState: GameState;
}

// Classic Monopoly board layout with proper colors
const BOARD_TILES = [
  // Bottom row (0-10) - left to right
  { pos: 0, name: 'GO', color: '#FF0000' },
  { pos: 1, name: 'Mediterranean Ave', color: '#955436' },
  { pos: 2, name: 'Community Chest', color: '#FFF9E6' },
  { pos: 3, name: 'Baltic Ave', color: '#955436' },
  { pos: 4, name: 'Income Tax', color: '#FFFFFF' },
  { pos: 5, name: 'Reading Railroad', color: '#000000' },
  { pos: 6, name: 'Oriental Ave', color: '#AAE0FA' },
  { pos: 7, name: 'Chance', color: '#FFE6E6' },
  { pos: 8, name: 'Vermont Ave', color: '#AAE0FA' },
  { pos: 9, name: 'Connecticut Ave', color: '#AAE0FA' },
  
  // Right column (10-20) - bottom to top
  { pos: 10, name: 'JAIL', color: '#FFA500' },
  { pos: 11, name: 'St. Charles Place', color: '#D93A96' },
  { pos: 12, name: 'Electric Company', color: '#FFFFFF' },
  { pos: 13, name: 'States Ave', color: '#D93A96' },
  { pos: 14, name: 'Virginia Ave', color: '#D93A96' },
  { pos: 15, name: 'Pennsylvania Railroad', color: '#000000' },
  { pos: 16, name: 'St. James Place', color: '#F7941D' },
  { pos: 17, name: 'Community Chest', color: '#FFF9E6' },
  { pos: 18, name: 'Tennessee Ave', color: '#F7941D' },
  { pos: 19, name: 'New York Ave', color: '#F7941D' },
  
  // Top row (20-30) - right to left
  { pos: 20, name: 'Free Parking', color: '#FF0000' },
  { pos: 21, name: 'Kentucky Ave', color: '#ED1B24' },
  { pos: 22, name: 'Chance', color: '#FFE6E6' },
  { pos: 23, name: 'Indiana Ave', color: '#ED1B24' },
  { pos: 24, name: 'Illinois Ave', color: '#ED1B24' },
  { pos: 25, name: 'B&O Railroad', color: '#000000' },
  { pos: 26, name: 'Atlantic Ave', color: '#FEF200' },
  { pos: 27, name: 'Ventnor Ave', color: '#FEF200' },
  { pos: 28, name: 'Water Works', color: '#FFFFFF' },
  { pos: 29, name: 'Marvin Gardens', color: '#FEF200' },
  
  // Left column (30-39) - top to bottom
  { pos: 30, name: 'GO TO JAIL', color: '#FF0000' },
  { pos: 31, name: 'Pacific Ave', color: '#1FB25A' },
  { pos: 32, name: 'North Carolina Ave', color: '#1FB25A' },
  { pos: 33, name: 'Community Chest', color: '#FFF9E6' },
  { pos: 34, name: 'Pennsylvania Ave', color: '#1FB25A' },
  { pos: 35, name: 'Short Line', color: '#000000' },
  { pos: 36, name: 'Chance', color: '#FFE6E6' },
  { pos: 37, name: 'Park Place', color: '#0072BB' },
  { pos: 38, name: 'Luxury Tax', color: '#FFFFFF' },
  { pos: 39, name: 'Boardwalk', color: '#0072BB' },
];

export default function Board({ gameState }: BoardProps) {
  // Split tiles into 4 sides - corners belong to horizontal rows
  const bottomTiles = BOARD_TILES.slice(0, 11);          // 0-10: GO → JAIL (11 tiles including both corners)
  const rightTiles = BOARD_TILES.slice(11, 20);          // 11-19: Right side (9 tiles, NO corners)
  const topTiles = BOARD_TILES.slice(20, 31).toReversed();    // 20-30: Free Parking → GO TO JAIL (11 tiles including both corners, reversed)
  const leftTiles = BOARD_TILES.slice(31, 40).toReversed();   // 31-39: Left side (9 tiles, NO corners)

  return (
    <div className="bg-gradient-to-br from-green-100 to-emerald-200 p-2 rounded-xl shadow-2xl inline-block">
      
      {/* Top Row (20-30) */}
      <div className="flex gap-0">
        {topTiles.map((tile) => (
          <Tile key={tile.pos} tile={tile} players={gameState.players} gameState={gameState} />
        ))}
      </div>

      {/* Middle section */}
      <div className="flex gap-0">
        {/* Left Column (31-39) - NO corner */}
        <div className="flex flex-col gap-0">
          {leftTiles.map((tile) => (
            <Tile key={tile.pos} tile={tile} players={gameState.players} gameState={gameState} />
          ))}
        </div>

        {/* Center Board Area - 9 tiles height (9 × 56px = 504px) */}
        <div className="flex items-center justify-center bg-gradient-to-br from-emerald-300 via-green-300 to-teal-300 shadow-inner" style={{ width: '504px', height: '504px' }}>
          <div className="text-center">
            <h2 className="text-4xl font-black text-green-900 mb-2 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.5)' }}>
              MONOPOLY
            </h2>
            <p className="text-xl font-semibold text-green-800 drop-shadow">Round: {gameState.round}</p>
          </div>
        </div>

        {/* Right Column (11-19) - NO corner */}
        <div className="flex flex-col gap-0">
          {rightTiles.map((tile) => (
            <Tile key={tile.pos} tile={tile} players={gameState.players} gameState={gameState} />
          ))}
        </div>
      </div>

      {/* Bottom Row (0-10) */}
      <div className="flex gap-0">
        {bottomTiles.map((tile) => (
          <Tile key={tile.pos} tile={tile} players={gameState.players} gameState={gameState} />
        ))}
      </div>
    </div>
  );
}

// Individual Tile Component
function Tile({ tile, players, gameState }: { tile: typeof BOARD_TILES[0]; players: any[]; gameState: GameState }) {
  const playersOnTile = players.filter(p => p.position === tile.pos);
  
  // Find owner of this property
  const owner = gameState.players.find(p => p.properties.includes(tile.pos));
  
  // Determine tile type
  const isCorner = [0, 10, 20, 30].includes(tile.pos);
  const isRailroad = tile.name.includes('Railroad');
  const isUtility = tile.name.includes('Company') || tile.name.includes('Works');
  const isChanceOrChest = tile.name.includes('Chance') || tile.name.includes('Chest');
  const isTax = tile.name.includes('Tax');
  
  // Background color for special tiles
  let bgColor = 'bg-white';
  if (isRailroad) bgColor = 'bg-gradient-to-br from-gray-50 to-slate-100';
  if (isUtility) bgColor = 'bg-gradient-to-br from-blue-50 to-cyan-50';
  if (isChanceOrChest && tile.name.includes('Chance')) bgColor = 'bg-gradient-to-br from-orange-50 to-red-50';
  if (isChanceOrChest && tile.name.includes('Chest')) bgColor = 'bg-gradient-to-br from-blue-50 to-indigo-50';
  if (isTax) bgColor = 'bg-gradient-to-br from-gray-50 to-slate-100';
  if (isCorner) bgColor = 'bg-gradient-to-br from-red-50 to-orange-50';
  
  // Text styling
  const textColor = 'text-gray-800';
  const textSize = isCorner ? 'text-[10px]' : 'text-[8px]';
  
  // Get player color based on their actual index in game
  const getPlayerColor = (player: any) => {
    const playerIndex = players.indexOf(player);
    if (playerIndex === 0) return 'bg-blue-500';
    if (playerIndex === 1) return 'bg-red-500';
    if (playerIndex === 2) return 'bg-green-500';
    return 'bg-yellow-500';
  };
  
  // Get owner color
  const getOwnerColor = () => {
    if (!owner) return '';
    const playerIndex = players.indexOf(owner);
    if (playerIndex === 0) return 'border-blue-500 bg-blue-500/10';
    if (playerIndex === 1) return 'border-red-500 bg-red-500/10';
    if (playerIndex === 2) return 'border-green-500 bg-green-500/10';
    return 'border-yellow-500 bg-yellow-500/10';
  };
  
  // Get owner initial color
  const getOwnerInitialColor = () => {
    if (!owner) return '#000';
    const playerIndex = players.indexOf(owner);
    if (playerIndex === 0) return '#3b82f6';
    if (playerIndex === 1) return '#ef4444';
    if (playerIndex === 2) return '#22c55e';
    return '#eab308';
  };
  
  return (
    <div
      className={`w-14 h-14 border-2 ${owner ? getOwnerColor() : 'border-gray-300'} ${bgColor} flex flex-col justify-between p-1 relative rounded-sm shadow-sm transition-all hover:shadow-md`}
      style={{ 
        borderTopColor: tile.color, 
        borderTopWidth: '10px',
        borderTopStyle: 'solid'
      }}
    >
      {/* Railroad icon */}
      {isRailroad && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-gray-800 opacity-20 text-lg">
          🚂
        </div>
      )}
      
      {/* Owner indicator */}
      {owner && !isCorner && (
        <div 
          className="absolute top-0.5 left-0.5 text-[6px] font-bold bg-white/90 px-1 rounded-sm shadow-sm" 
          style={{ color: getOwnerInitialColor() }}
        >
          {owner.name.charAt(0)}
        </div>
      )}
      
      <span className={`${textSize} font-bold text-center leading-tight ${textColor} drop-shadow-sm relative z-10`}>
        {tile.name}
      </span>
      
      {/* Players on this tile */}
      <div className="flex gap-0.5 flex-wrap justify-center mt-auto">
        {playersOnTile.map((player) => (
          <div
            key={player.id}
            className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-md ${getPlayerColor(player)} player-piece`}
            title={player.name}
          />
        ))}
      </div>
      
      {/* Position number */}
      <div className="absolute top-0.5 right-0.5 text-[6px] text-gray-400 font-mono bg-white/90 px-1 rounded-sm shadow-sm">
        {tile.pos}
      </div>
    </div>
  );
}
