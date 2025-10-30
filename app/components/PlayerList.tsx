import { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function PlayerList({ players, currentPlayerIndex }: PlayerListProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">All Players</h3>
      
      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${index === currentPlayerIndex
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
              }
            `}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-lg">
                  {index === currentPlayerIndex && '👉 '}
                  {player.name}
                </span>
                <span className="ml-2 text-sm text-gray-600">
                  Pos: {player.position}
                </span>
              </div>
              <span className="font-semibold text-green-600">
                ${player.money}
              </span>
            </div>
            
            {player.properties.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Properties: {player.properties.length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
