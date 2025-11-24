'use client';

import { useState, useEffect } from 'react';
import { GameEngine } from '@/lib/game';
import { AIDecisions, AIStrategy } from '@/lib/ai/AIDecisions';
import { Board, DiceRoller, GameControls, PlayerList, GameStatus } from './components';
import { DiceRoll } from '@/lib/types';

export default function Home() {
  const [game, setGame] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [hasRolled, setHasRolled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [lastRentTransaction, setLastRentTransaction] = useState<{ amount: number; paidTo?: string; receivedFrom?: string } | null>(null);

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

  const handleRoll = async (result: DiceRoll) => {
    if (!game || !isHumanTurn() || hasRolled || isProcessing) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    console.log('[ROLL] Before:', currentPlayer.name, 'position:', currentPlayer.position);

    setHasRolled(true);
    setLastRoll(result);
    setLastRentTransaction(null); // Clear previous rent notification

    // Check doubles logic
    if (result.isDouble) {
      currentPlayer.consecutiveDoublesCount++;
      console.log(`[DOUBLES] ${currentPlayer.name} rolled doubles! Count: ${currentPlayer.consecutiveDoublesCount}`);

      // 3 consecutive doubles = Go to Jail
      if (currentPlayer.consecutiveDoublesCount >= 3) {
        setMessage(`${currentPlayer.name} rolled 3 consecutive doubles! 🚔 Go to Jail!`);
        setLogs(prev => [...prev, `${currentPlayer.name} rolled doubles (${result.d1}, ${result.d2}) - 3rd consecutive! Going to Jail!`]);
        game.sendToJail(currentPlayer.id);
        forceUpdate();
        return; // Don't move, just go to jail
      }
    } else {
      currentPlayer.consecutiveDoublesCount = 0;
    }

    const doublesMsg = result.isDouble ? ' (DOUBLES!)' : '';
    setMessage(`${currentPlayer.name} rolled ${result.d1} + ${result.d2} = ${result.total}${doublesMsg}. Moving...`);

    // Animate the movement
    await animateMove(currentPlayer, result.total);

    const finalTile = game.board.tiles[currentPlayer.position];
    console.log('[ROLL] After:', currentPlayer.name, 'position:', currentPlayer.position);

    // Check if can buy property or pay rent
    let logMsg = `${currentPlayer.name} rolled ${result.total}${doublesMsg} and moved to ${finalTile.name}`;
    if (finalTile.property && !finalTile.property.ownerId) {
      if (currentPlayer.money >= finalTile.property.price) {
        logMsg += ` - Available to buy for $${finalTile.property.price}!`;
        const actionMsg = result.isDouble
          ? `You can buy ${finalTile.name} for $${finalTile.property.price}! Roll again or End Turn.`
          : `You can buy ${finalTile.name} for $${finalTile.property.price}! Click "Buy Property" or "End Turn"`;
        setMessage(actionMsg);
      } else {
        logMsg += ` - Too expensive! ($${finalTile.property.price})`;
        setMessage(`${finalTile.name} costs $${finalTile.property.price} but you only have $${currentPlayer.money}`);
      }
    } else if (finalTile.property?.ownerId && finalTile.property.ownerId !== currentPlayer.id) {
      // Pay rent to owner
      const owner = game.players.find(p => p.id === finalTile.property!.ownerId);
      const rentAmount = finalTile.property.rent;
      const success = game.payRent(currentPlayer.id, finalTile.property.id);

      if (success) {
        logMsg += ` - Paid $${rentAmount} rent to ${owner?.name}`;
        const rentMsg = result.isDouble
          ? `💸 Paid $${rentAmount} rent to ${owner?.name}. Roll again!`
          : `💸 Paid $${rentAmount} rent to ${owner?.name} for ${finalTile.name}`;
        setMessage(rentMsg);
        setLastRentTransaction({ amount: rentAmount, paidTo: owner?.name });
      }
      forceUpdate();
    } else {
      const endMsg = result.isDouble ? `${logMsg}. Roll again!` : logMsg;
      setMessage(endMsg);
    }

    setLogs(prev => [...prev, logMsg]);

    // If doubles, allow rolling again (don't auto-end turn)
    if (result.isDouble) {
      setHasRolled(false); // Allow rolling again
    }

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
    setLastRentTransaction(null); // Clear rent notification
    
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

      // AI can roll multiple times if gets doubles
      let canRollAgain = true;
      while (canRollAgain) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const roll = game.rollDice();
        const doublesMsg = roll.isDouble ? ' (DOUBLES!)' : '';
        setLogs(prev => [...prev, `${currentAI.name} rolled ${roll.d1} + ${roll.d2} = ${roll.total}${doublesMsg}`]);
        setMessage(`${currentAI.name} rolled ${roll.total}${doublesMsg}. Moving...`);
        forceUpdate();

        // Check for doubles
        if (roll.isDouble) {
          currentAI.consecutiveDoublesCount++;
          console.log(`[AI DOUBLES] ${currentAI.name} rolled doubles! Count: ${currentAI.consecutiveDoublesCount}`);

          // 3 consecutive doubles = Go to Jail
          if (currentAI.consecutiveDoublesCount >= 3) {
            setLogs(prev => [...prev, `${currentAI.name} rolled 3 consecutive doubles! Going to Jail!`]);
            setMessage(`${currentAI.name} rolled 3 consecutive doubles! 🚔 Going to Jail!`);
            game.sendToJail(currentAI.id);
            forceUpdate();
            canRollAgain = false;
            break; // Don't move, end turn
          }
        } else {
          currentAI.consecutiveDoublesCount = 0;
          canRollAgain = false; // No doubles, end turn after this roll
        }

        // Animate AI movement
        await animateMove(currentAI, roll.total);

        const finalTile = game.board.tiles[currentAI.position];

        console.log(`[AI TURN] ${currentAI.name} rolled ${roll.total}, moved to position ${currentAI.position}`);

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
            const owner = game.players.find(p => p.id === property.ownerId);
            const success = game.payRent(currentAI.id, property.id);
            if (success) {
              console.log(`[AI TURN] ${currentAI.name} paid rent to ${owner?.name}`);
              setLogs(prev => [...prev, `${currentAI.name} paid $${property.rent} rent to ${owner?.name}`]);
              setMessage(`💸 ${currentAI.name} paid $${property.rent} rent to ${owner?.name}`);

              // Check if human player received rent
              if (property.ownerId === '1') { // Human player is ID '1'
                setLastRentTransaction({ amount: property.rent, receivedFrom: currentAI.name });
              }

              forceUpdate();
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 400));

        // If got doubles and not going to jail, roll again
        if (roll.isDouble && currentAI.consecutiveDoublesCount < 3) {
          setMessage(`${currentAI.name} rolled doubles! Rolling again...`);
          setLogs(prev => [...prev, `${currentAI.name} gets to roll again (doubles)`]);
          canRollAgain = true;
        } else {
          canRollAgain = false;
        }
      }

      game.nextTurn();
      console.log(`[AI TURN] ${currentAI.name} ended turn. Next player index: ${game.currentPlayerIndex}`);
      forceUpdate();
    }

    console.log('[AI TURNS] All AI turns completed. Back to human turn.');
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

  // Get property details for buy button
  const buyableProperty = canBuyProperty && currentTile?.property ? {
    name: currentTile.property.name,
    price: currentTile.property.price
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
          🎲 Not-A-Monopoly 🎲
        </h1>
        
        {/* Debug info */}
        <div className="text-center text-sm text-gray-600 mb-6">
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
          {lastRoll && <span className="ml-2 font-bold text-blue-600">🎲 Dice: {lastRoll.d1} + {lastRoll.d2} = {lastRoll.total}</span>}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Always show last roll card */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg shadow-lg text-center">
              <div className="text-sm font-semibold mb-1">Last Roll</div>
              <div className="text-4xl font-bold">
                {lastRoll ? `🎲 ${lastRoll.total}` : '🎲 -'}
              </div>
              {lastRoll && (
                <div className="text-sm mt-1">
                  ({lastRoll.d1} + {lastRoll.d2})
                  {lastRoll.isDouble && <span className="ml-2">✨ DOUBLES</span>}
                </div>
              )}
            </div>

            {/* Rent transaction notification */}
            {lastRentTransaction && (
              <div className={`p-4 rounded-lg shadow-lg text-center text-white ${
                lastRentTransaction.paidTo 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}>
                <div className="text-sm font-semibold mb-1">
                  {lastRentTransaction.paidTo ? '💸 Paid Rent' : '💰 Received Rent'}
                </div>
                <div className="text-3xl font-bold">${lastRentTransaction.amount}</div>
                <div className="text-xs mt-1">
                  {lastRentTransaction.paidTo && `to ${lastRentTransaction.paidTo}`}
                  {lastRentTransaction.receivedFrom && `from ${lastRentTransaction.receivedFrom}`}
                </div>
              </div>
            )}
            
            <DiceRoller 
              onRoll={handleRoll} 
              disabled={!humanTurn || hasRolled || isProcessing}
            />
            <GameControls
              onBuyProperty={handleBuyProperty}
              onEndTurn={handleEndTurn}
              canBuyProperty={canBuyProperty}
              disabled={!humanTurn || !hasRolled || isProcessing}
              propertyPrice={buyableProperty?.price}
              propertyName={buyableProperty?.name}
            />
          </div>

          {/* Center - Board */}
          <div className="col-span-12 lg:col-span-6 flex items-start justify-center pt-4">
            <Board gameState={gameState} />
          </div>

          {/* Right Sidebar - Info */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <GameStatus round={gameState.round} message={message} logs={logs} />
            <PlayerList players={gameState.players} currentPlayerIndex={gameState.currentPlayerIndex} />
          </div>
        </div>
      </div>
    </div>
  );
}
