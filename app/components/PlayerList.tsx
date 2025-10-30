import { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
}

// Map property positions to names (simplified)
const PROPERTY_NAMES: { [key: number]: string } = {
  1: 'Mediterranean Ave',
  3: 'Baltic Ave',
  5: 'Reading RR',
  6: 'Oriental Ave',
  8: 'Vermont Ave',
  9: 'Connecticut Ave',
  11: 'St. Charles',
  12: 'Electric Co',
  13: 'States Ave',
  14: 'Virginia Ave',
  15: 'Penn RR',
  16: 'St. James',
  18: 'Tennessee Ave',
  19: 'New York Ave',
  21: 'Kentucky Ave',
  23: 'Indiana Ave',
  24: 'Illinois Ave',
  25: 'B&O RR',
  26: 'Atlantic Ave',
  27: 'Ventnor Ave',
  28: 'Water Works',
  29: 'Marvin Gardens',
  31: 'Pacific Ave',
  32: 'N. Carolina',
  34: 'Pennsylvania Ave',
  35: 'Short Line',
  37: 'Park Place',
  39: 'Boardwalk'
};

export default function PlayerList({ players, currentPlayerIndex }: PlayerListProps) {
  const getPlayerBorderClass = (index: number, isCurrent: boolean) => {
    if (isCurrent) {
      if (index === 0) return 'border-blue-500 bg-blue-50';
      if (index === 1) return 'border-red-500 bg-red-50';
      if (index === 2) return 'border-green-500 bg-green-50';
      return 'border-yellow-500 bg-yellow-50';
    }
    return 'border-gray-200 bg-gray-50';
  };

  const getPlayerColorDot = (index: number) => {
    if (index === 0) return 'bg-blue-500';
    if (index === 1) return 'bg-red-500';
    if (index === 2) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-h-[600px] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-gray-900">All Players</h3>
      
      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${getPlayerBorderClass(index, index === currentPlayerIndex)}
            `}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPlayerColorDot(index)}`} />
                <span className="font-bold text-lg text-gray-900">
                  {index === currentPlayerIndex && '👉 '}
                  {player.name}
                </span>
              </div>
              <span className="font-bold text-green-600 text-xl">
                ${player.money}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 font-medium mb-1">
              Position: {player.position}
            </div>
            
            {player.properties.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-bold text-gray-800 mb-1">
                  Properties ({player.properties.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {player.properties.map((propId) => (
                    <span
                      key={propId}
                      className="text-[11px] font-semibold bg-gray-200 text-gray-800 px-2 py-1 rounded-md border border-gray-400"
                      title={PROPERTY_NAMES[propId]}
                    >
                      {PROPERTY_NAMES[propId]?.split(' ')[0] || `#${propId}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

