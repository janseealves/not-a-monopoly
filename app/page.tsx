'use client';

import { useState, useEffect } from 'react';
import { GameEngine } from '@/lib/game';
import { AIDecisions, AIStrategy } from '@/lib/ai/AIDecisions';
import { Board, DiceRoller, GameControls, PlayerList, GameStatus } from './components';

export default function Home() {
  const [game, setGame] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [hasRolled, setHasRolled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  // Initialize game on mount
  useEffect(() => {
    const playerNames = ['You', 'AI Player 1', 'AI Player 2', 'AI Player 3'];
    const gameInstance = new GameEngine(playerNames);
    
    setGame(gameInstance);
    setGameState(gameInstance.getGameState());
    setMessage('Game started! Roll the dice to begin.');
    setLogs(['Game initialized with 4 players']);
  }, []);

  const isHumanTurn = () => {
    if (!game) return false;
    return game.currentPlayerIndex === 0;
  };

  const forceUpdate = () => {
    if (game) {
      setGameState(game.getGameState());
    }
  };

  const animateMove = async (player: any, steps: number) => {
    // Animate movement step by step
    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 150)); // 150ms per step
      player.position = (player.position + 1) % game!.board.tiles.length;
      forceUpdate(); // Force re-render for each step
    }
  };

  const handleRoll = async (result: number) => {
    if (!game || !isHumanTurn() || hasRolled || isProcessing) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    console.log('[ROLL] Before:', currentPlayer.name, 'position:', currentPlayer.position);

    setHasRolled(true);
    setLastRoll(result);
    setMessage(`${currentPlayer.name} rolled ${result}. Moving...`);
    
    // Animate the movement
    await animateMove(currentPlayer, result);
    
    const finalTile = game.board.tiles[currentPlayer.position];
    console.log('[ROLL] After:', currentPlayer.name, 'position:', currentPlayer.position);

    // Check if can buy property
    let logMsg = `${currentPlayer.name} rolled ${result} and moved to ${finalTile.name}`;
    if (finalTile.property && !finalTile.property.ownerId) {
      if (currentPlayer.money >= finalTile.property.price) {
        logMsg += ` - Available to buy for $${finalTile.property.price}!`;
        setMessage(`You can buy ${finalTile.name} for $${finalTile.property.price}! Click "Buy Property" or "End Turn"`);
      } else {
        logMsg += ` - Too expensive! ($${finalTile.property.price})`;
        setMessage(`${finalTile.name} costs $${finalTile.property.price} but you only have $${currentPlayer.money}`);
      }
    } else if (finalTile.property?.ownerId) {
      const owner = game.players.find(p => p.id === finalTile.property!.ownerId);
      logMsg += ` - Owned by ${owner?.name}`;
      setMessage(`${finalTile.name} is owned by ${owner?.name}`);
    } else {
      setMessage(logMsg);
    }
    
    setLogs(prev => [...prev, logMsg]);
    forceUpdate();
  };

  const handleBuyProperty = () => {
    if (!game || !isHumanTurn() || !hasRolled) return;
    
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    const currentTile = game.board.tiles[currentPlayer.position];
    if (!currentTile.property || currentTile.property.ownerId) {
      setMessage('Cannot buy this property');
      return;
    }

    const success = game.buyProperty(currentPlayer.id, currentTile.property.id);
    if (success) {
      setLogs(prev => [...prev, `${currentPlayer.name} bought ${currentTile.property!.name} for $${currentTile.property!.price}`]);
      setMessage(`Bought ${currentTile.property!.name}!`);
      forceUpdate();
    } else {
      setMessage('Not enough money!');
    }
  };

  const handleEndTurn = async () => {
    if (!game || !isHumanTurn() || !hasRolled || isProcessing) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    setLogs(prev => [...prev, `${currentPlayer.name} ended their turn`]);
    setIsProcessing(true);
    setLastRoll(null); // Reset dice display
    
    game.nextTurn();
    forceUpdate();
    
    // Small delay before starting AI turns
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Execute AI turns
    await executeAITurns();
    
    // Reset state for next human turn
    setHasRolled(false);
    setIsProcessing(false);
    setMessage(`${game.getCurrentPlayer()?.name}'s turn! Roll the dice.`);
    forceUpdate();
  };

  const executeAITurns = async () => {
    if (!game) return;

    console.log('[AI TURNS] Starting AI turns...');

    while (game.currentPlayerIndex !== 0) {
      const currentAI = game.getCurrentPlayer();
      if (!currentAI) break;

      console.log(`[AI TURN] ${currentAI.name} starting turn. Position: ${currentAI.position}`);

      await new Promise(resolve => setTimeout(resolve, 800));

      const roll = game.rollDice();
      setLogs(prev => [...prev, `${currentAI.name} rolled ${roll}. Moving...`]);
      setMessage(`${currentAI.name} rolled ${roll}. Moving...`);
      forceUpdate();
      
      // Animate AI movement
      await animateMove(currentAI, roll);
      
      const finalTile = game.board.tiles[currentAI.position];
      
      console.log(`[AI TURN] ${currentAI.name} rolled ${roll}, moved to position ${currentAI.position}`);
      
      setLogs(prev => [...prev, `${currentAI.name} moved to ${finalTile.name}`]);
      setMessage(`${currentAI.name} is at ${finalTile.name}`);
      forceUpdate();
      
      await new Promise(resolve => setTimeout(resolve, 400));

      // Process landing on tile
      if (finalTile.property) {
        const property = finalTile.property;
        
        if (!property.ownerId) {
          // Try to buy - usa estratégia AGGRESSIVE
          const shouldBuy = AIDecisions.shouldBuyProperty(currentAI, property, AIStrategy.AGGRESSIVE);
          if (shouldBuy) {
            const success = game.buyProperty(currentAI.id, property.id);
            if (success) {
              console.log(`[AI TURN] ${currentAI.name} bought ${property.name}`);
              setLogs(prev => [...prev, `${currentAI.name} bought ${property.name} for $${property.price}`]);
              setMessage(`${currentAI.name} bought ${property.name}!`);
              forceUpdate();
            }
          }
        } else if (property.ownerId !== currentAI.id) {
          // Pay rent
          const success = game.payRent(currentAI.id, property.id);
          if (success) {
            const owner = game.players.find(p => p.id === property.ownerId);
            console.log(`[AI TURN] ${currentAI.name} paid rent to ${owner?.name}`);
            setLogs(prev => [...prev, `${currentAI.name} paid $${property.rent} rent to ${owner?.name}`]);
            setMessage(`${currentAI.name} paid rent`);
            forceUpdate();
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      game.nextTurn();
      console.log(`[AI TURN] ${currentAI.name} ended turn. Next player index: ${game.currentPlayerIndex}`);
      forceUpdate();
    }
    
    console.log('[AI TURNS] All AI turns completed. Back to human turn.');
    setLastRoll(null); // Clear dice display for next human turn
  };

  if (!game || !gameState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  const currentPlayer = game.getCurrentPlayer();
  const humanTurn = isHumanTurn();
  
  // Check if current tile is a buyable property
  const currentTile = currentPlayer ? game.board.tiles[currentPlayer.position] : null;
  const canBuyProperty = Boolean(
    humanTurn && 
    hasRolled && 
    !isProcessing && 
    currentTile?.property && 
    !currentTile.property.ownerId &&
    currentPlayer &&
    currentPlayer.money >= currentTile.property.price
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-center py-4 text-gray-800">
        🎲 Not-A-Monopoly 🎲
      </h1>
      
      {/* Debug info */}
      <div className="text-center text-sm text-gray-600 pb-2">
        <span className="font-bold">Current Player: {currentPlayer?.name}</span>
        {' | '}
        <span className={`ml-2 ${humanTurn ? 'text-green-600 font-bold' : 'text-red-600'}`}>
          {humanTurn ? '✓ YOUR TURN' : '⏳ AI PLAYING'}
        </span>
        {' | '}
        <span className="ml-2">Rolled: {hasRolled ? '✓' : '✗'}</span>
        {' | '}
        <span className="ml-2">Processing: {isProcessing ? '⏳' : '✗'}</span>
        {' | '}
        {lastRoll && <span className="ml-2 font-bold text-blue-600">🎲 Dice: {lastRoll}</span>}
      </div>

      <div className="flex gap-4 p-4">
        {/* Left Sidebar */}
        <div className="w-64 space-y-4">
          {/* Show last roll */}
          {lastRoll && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg shadow-lg text-center">
              <div className="text-sm font-semibold mb-1">Last Roll</div>
              <div className="text-4xl font-bold">🎲 {lastRoll}</div>
            </div>
          )}
          
          <DiceRoller 
            onRoll={handleRoll} 
            disabled={!humanTurn || hasRolled || isProcessing}
            reset={!hasRolled}
          />
          <GameControls
            onBuyProperty={handleBuyProperty}
            onEndTurn={handleEndTurn}
            canBuyProperty={canBuyProperty}
            disabled={!humanTurn || !hasRolled || isProcessing}
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
