import { Player } from '@/lib/types';

interface PlayerInfoProps {
  player: Player | null;
}

export default function PlayerInfo({ player }: PlayerInfoProps) {
  if (!player) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-500">No player selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-500">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Current Player</h2>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Name:</span>
          <span className="text-lg font-bold">{player.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Money:</span>
          <span className="text-lg font-bold text-green-600">${player.money}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Position:</span>
          <span className="text-lg">{player.position}</span>
        </div>

        <div>
          <span className="font-semibold text-gray-700">Properties:</span>
          <div className="mt-2">
            {player.properties.length === 0 ? (
              <p className="text-gray-400 text-sm">No properties owned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {player.properties.map((propId) => (
                  <span
                    key={propId}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                  >
                    Property #{propId}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {player.inJail && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
            🚔 In Jail
          </div>
        )}
      </div>
    </div>
  );
}
