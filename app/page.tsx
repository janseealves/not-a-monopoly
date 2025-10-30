'use client';

import { useState, useEffect } from 'react';
import { GameEngine } from '@/lib/game';
import { GameFlowManager } from '@/lib/ai/GameFlowManager';
import { Board, PlayerInfo, DiceRoller, GameControls, PlayerList, GameStatus } from './components';

export default function Home() {
  const [game, setGame] = useState<GameEngine | null>(null);
  const [flowManager, setFlowManager] = useState<GameFlowManager | null>(null);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  // Initialize game on mount
  useEffect(() => {
    const playerNames = ['You', 'AI Player 1', 'AI Player 2', 'AI Player 3'];
    const gameInstance = new GameEngine(playerNames);
    const flowInstance = new GameFlowManager(gameInstance, 3);
    
    setGame(gameInstance);
    setFlowManager(flowInstance);
    setMessage('Game started! Roll the dice to begin.');
    setLogs(['Game initialized with 4 players']);
  }, []);

  const handleRoll = (result: number) => {
    if (!game || !flowManager) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    // Move player
    const moveResult = game.moveCurrentPlayer(result);
    
    const logMsg = `${currentPlayer.name} rolled ${result} and moved to ${moveResult?.tile.name}`;
    setLogs(prev => [...prev, logMsg]);
    setMessage(logMsg);
    // Force re-render without replacing the GameEngine instance
    setTick((t) => t + 1);
  };

  const handleBuyProperty = () => {
    if (!game) return;
    
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    setLogs(prev => [...prev, `${currentPlayer.name} attempted to buy property`]);
    setMessage('Property purchase not implemented yet');
  };

  const handleEndTurn = () => {
    if (!game || !flowManager) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    game.nextTurn();
    setLogs(prev => [...prev, `${currentPlayer.name} ended their turn`]);
    setMessage('Turn ended. Next player...');
    
    // Trigger AI turns if needed
    flowManager.executeTurn();
    
    // Force re-render without replacing the GameEngine instance
    setTick((t) => t + 1);
  };

  if (!game || !flowManager) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  const gameState = game.getGameState();
  const currentPlayer = game.getCurrentPlayer();
  const isHumanTurn = flowManager.isHumanTurn;

  return (
    <div data-tick={tick} className="min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-center py-4 text-gray-800">
        🎲 Not-A-Monopoly 🎲
      </h1>

      <div className="flex gap-4 p-4">
        {/* Left Sidebar */}
        <div className="w-64 space-y-4">
          <PlayerInfo player={currentPlayer} />
          <DiceRoller onRoll={handleRoll} disabled={!isHumanTurn} />
          <GameControls
            onBuyProperty={handleBuyProperty}
            onEndTurn={handleEndTurn}
            canBuyProperty={false}
            disabled={!isHumanTurn}
          />
        </div>

        {/* Center - Board (takes remaining space) */}
        <div className="flex-1 flex items-center justify-center">
          <Board gameState={gameState} />
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-4">
          <GameStatus round={gameState.round} message={message} logs={logs} />
          <PlayerList players={gameState.players} currentPlayerIndex={gameState.currentPlayerIndex} />
        </div>
      </div>
    </div>
  );
}
