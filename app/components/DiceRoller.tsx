import { useState } from 'react';
import { DiceRoll } from '@/lib/types';

interface DiceRollerProps {
  onRoll: (result: DiceRoll) => void;
  disabled?: boolean;
}

export default function DiceRoller({ onRoll, disabled = false }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

  const handleRoll = () => {
    if (rolling || disabled) return;

    setRolling(true);

    // Simple animation
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      const isDouble = d1 === d2;
      const result: DiceRoll = { d1, d2, total, isDouble };

      setLastRoll(result);
      setRolling(false);
      onRoll(result);
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
      <h3 className="text-xl font-bold mb-4">Roll Dice</h3>

      <div className="flex gap-4 justify-center mb-4">
        <div className={`
          w-20 h-20 rounded-lg text-3xl font-bold shadow-lg flex items-center justify-center
          ${rolling ? 'animate-bounce' : ''}
          ${disabled ? 'bg-gray-300' : 'bg-red-500'}
          text-white
        `}>
          {lastRoll ? lastRoll.d1 : '🎲'}
        </div>
        <div className={`
          w-20 h-20 rounded-lg text-3xl font-bold shadow-lg flex items-center justify-center
          ${rolling ? 'animate-bounce' : ''}
          ${disabled ? 'bg-gray-300' : 'bg-red-500'}
          text-white
        `}>
          {lastRoll ? lastRoll.d2 : '🎲'}
        </div>
      </div>

      {lastRoll && (
        <div className="mb-4 text-lg">
          <span className="font-bold">Total: {lastRoll.total}</span>
          {lastRoll.isDouble && (
            <span className="ml-2 text-green-600 font-bold">✨ DOUBLES!</span>
          )}
        </div>
      )}

      <button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className={`
          px-6 py-3 rounded-lg font-bold shadow-lg
          transition-all duration-200
          ${disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:scale-95'}
          text-white
        `}
      >
        {rolling ? 'Rolling...' : 'Roll Dice'}
      </button>
    </div>
  );
}
