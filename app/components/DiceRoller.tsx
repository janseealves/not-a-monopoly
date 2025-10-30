import { useState, useEffect } from 'react';

interface DiceRollerProps {
  onRoll: (result: number) => void;
  disabled?: boolean;
  reset?: boolean;
}

export default function DiceRoller({ onRoll, disabled = false, reset = false }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  // Reset the dice display when reset prop changes
  useEffect(() => {
    if (reset) {
      setLastRoll(null);
    }
  }, [reset]);

  const handleRoll = () => {
    if (rolling || disabled) return;

    setRolling(true);
    
    // Simple animation
    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      setLastRoll(result);
      setRolling(false);
      onRoll(result);
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
      <h3 className="text-xl font-bold mb-4">Roll Dice</h3>
      
      <button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className={`
          w-24 h-24 rounded-lg text-4xl font-bold shadow-lg
          transition-all duration-200
          ${rolling ? 'animate-bounce' : ''}
          ${disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95'}
          text-white
        `}
      >
        {rolling ? '🎲' : lastRoll || '🎲'}
      </button>

      {lastRoll && !rolling && (
        <p className="mt-4 text-lg font-semibold text-green-600">
          You rolled: {lastRoll}
        </p>
      )}
    </div>
  );
}
