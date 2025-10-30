interface GameControlsProps {
  onBuyProperty: () => void;
  onEndTurn: () => void;
  canBuyProperty: boolean;
  disabled?: boolean;
}

export default function GameControls({
  onBuyProperty,
  onEndTurn,
  canBuyProperty,
  disabled = false
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
          🏠 Buy Property
        </button>

        <button
          onClick={onEndTurn}
          disabled={disabled}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold
            transition-colors duration-200
            ${disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
            }
          `}
        >
          ✅ End Turn
        </button>
      </div>
    </div>
  );
}
