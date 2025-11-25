interface GameControlsProps {
  onBuyProperty: () => void;
  onEndTurn: () => void;
  canBuyProperty: boolean;
  canEndTurn: boolean;
  disabled?: boolean;
  propertyPrice?: number;
  propertyName?: string;
}

export default function GameControls({
  onBuyProperty,
  onEndTurn,
  canBuyProperty,
  canEndTurn,
  disabled = false,
  propertyPrice,
  propertyName
}: GameControlsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Actions</h3>
      
      <div className="space-y-3">
        <button
          onClick={onBuyProperty}
          disabled={!canBuyProperty || disabled}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold
            transition-colors duration-200
            ${canBuyProperty && !disabled
              ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {canBuyProperty && propertyPrice && propertyName ? (
            <div className="flex flex-col">
              <span className="text-sm">🏠 Buy Property</span>
              <span className="text-xs mt-1">{propertyName}</span>
              <span className="text-lg font-bold mt-1">${propertyPrice}</span>
            </div>
          ) : (
            '🏠 Buy Property'
          )}
        </button>

        <button
          onClick={onEndTurn}
          disabled={!canEndTurn || disabled}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold
            transition-colors duration-200
            ${canEndTurn && !disabled
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          ✅ End Turn
        </button>
      </div>
    </div>
  );
}
