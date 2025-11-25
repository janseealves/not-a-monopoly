'use client';

import { useState, useEffect } from 'react';
import { GameEngine } from '@/lib/game';
import { AIDecisions, AIStrategy } from '@/lib/ai/AIDecisions';
import { Board, DiceRoller, GameControls, PlayerList, GameStatus } from './components';
import { DiceRoll, TileType, Card, CardType } from '@/lib/types';
import { PASS_GO_AMOUNT, INCOME_TAX_PERCENT, LUXURY_TAX_AMOUNT, BAIL_AMOUNT } from '@/lib/constants';

export default function Home() {
  const [game, setGame] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [hasRolled, setHasRolled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [lastRentTransaction, setLastRentTransaction] = useState<{ amount: number; paidTo?: string; receivedFrom?: string } | null>(null);
  const [showIncomeTaxChoice, setShowIncomeTaxChoice] = useState(false);
  const [incomeTaxOptions, setIncomeTaxOptions] = useState<{ tenPercent: number; fixed: number } | null>(null);
  const [canBuyCurrentProperty, setCanBuyCurrentProperty] = useState(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [showPropertyManagement, setShowPropertyManagement] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [isPayingBail, setIsPayingBail] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    const playerNames = ['You', 'AI Player 1', 'AI Player 2', 'AI Player 3'];
    const gameInstance = new GameEngine(playerNames);

    // Add bankruptcy and win event listeners
    gameInstance.addEventListener('playerBankrupt', (data) => {
      setLogs(prev => [...prev, `💀 ${data.playerName} is bankrupt and eliminated!`]);
      setMessage(`${data.playerName} went bankrupt!`);
    });

    gameInstance.addEventListener('gameWon', (data) => {
      setGameWinner(data.playerName);
      setMessage(`🏆 ${data.playerName} wins the game!`);
    });

    gameInstance.addEventListener('cardDrawn', (data) => {
      setDrawnCard(data.card);
    });

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

    // Handle jail logic
    if (currentPlayer.inJail) {
      console.log(`[JAIL] ${currentPlayer.name} is in jail. Turn ${currentPlayer.jailTurns + 1}/3`);

      if (result.isDouble) {
        // Rolled doubles - get out of jail!
        game.releaseFromJail(currentPlayer.id);
        setMessage(`🎲 ${currentPlayer.name} rolled doubles (${result.d1}, ${result.d2}) and got out of jail!`);
        setLogs(prev => [...prev, `${currentPlayer.name} rolled doubles and escaped jail!`]);
        setHasRolled(false); // Can roll again
        forceUpdate();
        return;
      } else if (currentPlayer.jailTurns >= 2) {
        // Increment before checking (this is the 3rd turn)
        currentPlayer.jailTurns++;
        // 3 turns in jail - must pay bail or stay
        if (currentPlayer.canAfford(BAIL_AMOUNT)) {
          game.payBail(currentPlayer.id);
          setMessage(`${currentPlayer.name} served 3 turns and paid $${BAIL_AMOUNT} bail to get out!`);
          setLogs(prev => [...prev, `${currentPlayer.name} paid bail after 3 turns`]);
        } else {
          setMessage(`${currentPlayer.name} can't afford bail! Still in jail.`);
          setLogs(prev => [...prev, `${currentPlayer.name} can't afford bail (need $${BAIL_AMOUNT})`]);
        }
        forceUpdate();
        return;
      } else {
        // Still in jail - increment jail turns
        currentPlayer.jailTurns++;
        setMessage(`${currentPlayer.name} rolled ${result.d1} + ${result.d2} (no doubles). Still in jail. (Turn ${currentPlayer.jailTurns}/3)`);
        setLogs(prev => [...prev, `${currentPlayer.name} failed to roll doubles. Jail turn ${currentPlayer.jailTurns}/3`]);
        forceUpdate();
        return;
      }
    }

    // Check doubles logic (for non-jailed players)
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

    // Check if passed GO during animation
    const oldPos = (currentPlayer.position - result.total + 40) % 40;
    const passedGo = oldPos + result.total >= 40;
    if (passedGo) {
      currentPlayer.addMoney(PASS_GO_AMOUNT);
      console.log(`💰 ${currentPlayer.name} passed GO and collected $${PASS_GO_AMOUNT}!`);
    }

    // Check if landed on GO_TO_JAIL tile
    if (finalTile.type === TileType.GO_TO_JAIL) {
      game.sendToJail(currentPlayer.id);
      setMessage(`🚔 ${currentPlayer.name} landed on "Go To Jail"!`);
      setLogs(prev => [...prev, `${currentPlayer.name} landed on Go To Jail`]);
      forceUpdate();
      return;
    }

    // Check if landed on JAIL tile naturally (Just Visiting)
    if (finalTile.type === TileType.JAIL && currentPlayer.position === 10 && !currentPlayer.inJail) {
      setMessage(`${currentPlayer.name} is Just Visiting Jail - no penalty!`);
      setLogs(prev => [...prev, `${currentPlayer.name} landed on Jail (Just Visiting)`]);
    }

    // Check if landed on CHANCE or COMMUNITY_CHEST tile
    if (finalTile.type === TileType.CHANCE || finalTile.type === TileType.COMMUNITY_CHEST) {
      const cardType = finalTile.type === TileType.CHANCE ? CardType.CHANCE : CardType.COMMUNITY_CHEST;
      const card = game.drawCard(cardType);
      if (card) {
        game.resolveCardAction(currentPlayer.id, card);
        // Card modal will show via event listener
        setLogs(prev => [...prev, `${currentPlayer.name} drew a ${cardType} card`]);
        forceUpdate();
        return; // Wait for user to acknowledge card
      }
    }

    // Check if landed on TAX tile
    if (finalTile.type === TileType.TAX) {
      if (finalTile.name === "Luxury Tax") {
        // Luxury Tax: automatic $75
        const taxAmount = game.applyTax(currentPlayer, finalTile);
        setLogs(prev => [...prev, `${currentPlayer.name} paid Luxury Tax: $${taxAmount}`]);
        setMessage(`💸 You paid Luxury Tax: $${taxAmount}`);
        forceUpdate();

        if (result.isDouble) {
          setHasRolled(false); // Allow rolling again
        }
        return;
      } else if (finalTile.name === "Income Tax") {
        // Income Tax: show choice UI
        const totalWorth = currentPlayer.money + currentPlayer.properties.reduce((sum, propId) => {
          const prop = game.board.getProperty(propId);
          return sum + (prop?.price ?? 0);
        }, 0);
        const tenPercent = Math.floor(totalWorth * INCOME_TAX_PERCENT);
        const fixed = 200;

        setIncomeTaxOptions({ tenPercent, fixed });
        setShowIncomeTaxChoice(true);
        setMessage(`💸 Income Tax: Choose to pay 10% ($${tenPercent}) or $200`);
        setLogs(prev => [...prev, `${currentPlayer.name} landed on Income Tax`]);
        forceUpdate();
        return;
      }
    }

    // Check if can buy property or pay rent
    let logMsg = `${currentPlayer.name} rolled ${result.total}${doublesMsg}`;
    if (passedGo) {
      logMsg += ` and passed GO (+$${PASS_GO_AMOUNT})`;
    }
    logMsg += ` and moved to ${finalTile.name}`;
    if (finalTile.property && !finalTile.property.ownerId) {
      if (currentPlayer.money >= finalTile.property.price) {
        logMsg += ` - Available to buy for $${finalTile.property.price}!`;
        const actionMsg = result.isDouble
          ? `You can buy ${finalTile.name} for $${finalTile.property.price}! Roll again or End Turn.`
          : `You can buy ${finalTile.name} for $${finalTile.property.price}! Click "Buy Property" or "End Turn"`;
        setMessage(actionMsg);
        setCanBuyCurrentProperty(true); // Enable buy button
      } else {
        logMsg += ` - Too expensive! ($${finalTile.property.price})`;
        setMessage(`${finalTile.name} costs $${finalTile.property.price} but you only have $${currentPlayer.money}`);
        setCanBuyCurrentProperty(false); // Can't afford
      }
    } else if (finalTile.property?.ownerId && finalTile.property.ownerId !== currentPlayer.id) {
      // Pay rent to owner
      const owner = game.players.find(p => p.id === finalTile.property!.ownerId);

      // Calculate rent before paying (for utilities, it's calculated in payRent)
      let rentAmount = finalTile.property.rent;
      if (finalTile.property.color === "utility") {
        // Calculate utility rent to display
        const ownerUtilities = owner?.properties.filter(propId => {
          const prop = game.board.getProperty(propId);
          return prop?.color === "utility";
        }).length || 0;
        const multiplier = ownerUtilities === 2 ? 10 : 4;
        rentAmount = result.total * multiplier;
      }

      const success = game.payRent(currentPlayer.id, finalTile.property.id, result.total);

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
      setCanBuyCurrentProperty(false); // No property to buy
    }

    setLogs(prev => [...prev, logMsg]);

    // If doubles, allow rolling again (don't auto-end turn)
    if (result.isDouble) {
      setHasRolled(false); // Allow rolling again
    }

    forceUpdate();
  };

  const handlePayBail = () => {
    if (!game || isPayingBail) return; // Prevent double-click

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.inJail) return;

    setIsPayingBail(true); // Disable button immediately

    const success = game.payBail(currentPlayer.id);
    if (success) {
      setLogs(prev => [...prev, `${currentPlayer.name} paid $${BAIL_AMOUNT} bail and got out of jail`]);
      setMessage(`✅ You paid $${BAIL_AMOUNT} bail! You can now roll.`);
      setHasRolled(false); // Allow rolling

      // Force immediate state update to hide jail UI
      setGameState(game.getGameState());

      // Reset after state updates
      setTimeout(() => setIsPayingBail(false), 100);
    } else {
      setMessage(`❌ You don't have enough money for bail ($${BAIL_AMOUNT})`);
      setIsPayingBail(false); // Re-enable if payment failed
    }
  };

  const handleIncomeTaxChoice = (payTenPercent: boolean) => {
    if (!game || !incomeTaxOptions) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    const currentTile = game.board.tiles[currentPlayer.position];
    const taxAmount = game.applyTax(currentPlayer, currentTile, payTenPercent);

    setLogs(prev => [...prev, `${currentPlayer.name} paid Income Tax: $${taxAmount} (chose ${payTenPercent ? '10%' : '$200'})`]);
    setMessage(`💸 You paid Income Tax: $${taxAmount}`);
    setShowIncomeTaxChoice(false);
    setIncomeTaxOptions(null);
    forceUpdate();

    // If had doubles, allow rolling again
    if (lastRoll?.isDouble) {
      setHasRolled(false);
      setMessage(`💸 Paid $${taxAmount}. Roll again!`);
    }
  };

  const handleBuyProperty = () => {
    if (!game || !isHumanTurn()) return;

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
      setCanBuyCurrentProperty(false); // Property bought, disable button
      forceUpdate();
    } else {
      setMessage('Not enough money!');
    }
  };

  const handleBuyHouse = (propertyId: number) => {
    if (!game) return;
    const success = game.buyHouse(game.getCurrentPlayer()?.id || '', propertyId);
    if (success) {
      setLogs(prev => [...prev, `Built house on property ${propertyId}`]);
      setGameState(game.getGameState());
    }
  };

  const handleBuyHotel = (propertyId: number) => {
    if (!game) return;
    const success = game.buyHotel(game.getCurrentPlayer()?.id || '', propertyId);
    if (success) {
      setLogs(prev => [...prev, `Built hotel on property ${propertyId}`]);
      setGameState(game.getGameState());
    }
  };

  const handleEndTurn = async () => {
    if (!game || !isHumanTurn() || !hasRolled || isProcessing) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    setLogs(prev => [...prev, `${currentPlayer.name} ended their turn`]);
    setIsProcessing(true);
    setLastRentTransaction(null); // Clear rent notification
    setCanBuyCurrentProperty(false); // Reset buy property state for next turn

    game.nextTurn();
    forceUpdate();
    
    // Small delay before starting AI turns
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Execute AI turns
    await executeAITurns();
    
    // Reset state for next human turn
    setHasRolled(false);
    setIsProcessing(false);
    setCanBuyCurrentProperty(false); // Reset for new turn
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
        setMessage(`${currentAI.name} rolled ${roll.total}${doublesMsg}...`);
        forceUpdate();

        // Handle jail logic for AI
        if (currentAI.inJail) {
          console.log(`[AI JAIL] ${currentAI.name} is in jail. Turn ${currentAI.jailTurns + 1}/3`);

          if (roll.isDouble) {
            // Rolled doubles - get out of jail!
            game.releaseFromJail(currentAI.id);
            setMessage(`${currentAI.name} rolled doubles and got out of jail!`);
            setLogs(prev => [...prev, `${currentAI.name} rolled doubles and escaped jail!`]);
            forceUpdate();
            canRollAgain = true; // Can roll again after escaping
            await new Promise(resolve => setTimeout(resolve, 400));
            continue; // Skip to next iteration to actually move
          } else if (currentAI.jailTurns >= 2) {
            // Increment before checking (this is the 3rd turn)
            currentAI.jailTurns++;
            // 3 turns in jail - pay bail
            game.payBail(currentAI.id);
            setMessage(`${currentAI.name} paid $${BAIL_AMOUNT} bail after 3 turns`);
            setLogs(prev => [...prev, `${currentAI.name} paid bail after 3 turns`]);
            forceUpdate();
            canRollAgain = false;
            break; // End turn after paying bail
          } else {
            // Still in jail - increment jail turns
            currentAI.jailTurns++;
            setMessage(`${currentAI.name} failed to roll doubles. Jail turn ${currentAI.jailTurns}/3`);
            setLogs(prev => [...prev, `${currentAI.name} failed to roll doubles. Jail turn ${currentAI.jailTurns}/3`]);
            forceUpdate();
            canRollAgain = false;
            break; // End turn
          }
        }

        // Check for doubles (non-jailed)
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
        const aiOldPos = currentAI.position;
        await animateMove(currentAI, roll.total);

        const finalTile = game.board.tiles[currentAI.position];

        // Check if AI passed GO
        const aiPassedGo = aiOldPos + roll.total >= 40;
        if (aiPassedGo) {
          currentAI.addMoney(PASS_GO_AMOUNT);
          console.log(`💰 ${currentAI.name} passed GO and collected $${PASS_GO_AMOUNT}!`);
        }

        console.log(`[AI TURN] ${currentAI.name} rolled ${roll.total}, moved to position ${currentAI.position}`);

        let aiMoveMsg = `${currentAI.name} moved to ${finalTile.name}`;
        if (aiPassedGo) {
          aiMoveMsg += ` (passed GO +$${PASS_GO_AMOUNT})`;
        }
        setLogs(prev => [...prev, aiMoveMsg]);
        setMessage(`${currentAI.name} is at ${finalTile.name}`);
        forceUpdate();

        await new Promise(resolve => setTimeout(resolve, 400));

        // Check if landed on GO_TO_JAIL tile
        if (finalTile.type === TileType.GO_TO_JAIL) {
          game.sendToJail(currentAI.id);
          setMessage(`🚔 ${currentAI.name} landed on "Go To Jail"!`);
          setLogs(prev => [...prev, `${currentAI.name} landed on Go To Jail`]);
          forceUpdate();
          canRollAgain = false;
          break; // End turn
        }

        // Check if landed on CHANCE or COMMUNITY_CHEST tile
        if (finalTile.type === TileType.CHANCE || finalTile.type === TileType.COMMUNITY_CHEST) {
          const cardType = finalTile.type === TileType.CHANCE ? CardType.CHANCE : CardType.COMMUNITY_CHEST;
          const card = game.drawCard(cardType);
          if (card) {
            game.resolveCardAction(currentAI.id, card);
            setMessage(`${currentAI.name} drew: ${card.description}`);
            setLogs(prev => [...prev, `${currentAI.name} drew a ${cardType} card: ${card.description}`]);
            forceUpdate();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Show card for 2 seconds
            setDrawnCard(null); // Auto-dismiss for AI
          }
        }

        // Check if landed on TAX tile
        if (finalTile.type === TileType.TAX) {
          let taxAmount = 0;
          if (finalTile.name === "Luxury Tax") {
            taxAmount = game.applyTax(currentAI, finalTile);
            setLogs(prev => [...prev, `${currentAI.name} paid Luxury Tax: $${taxAmount}`]);
            setMessage(`${currentAI.name} paid Luxury Tax: $${taxAmount}`);
          } else if (finalTile.name === "Income Tax") {
            // AI chooses whichever is cheaper
            const totalWorth = currentAI.money + currentAI.properties.reduce((sum, propId) => {
              const prop = game.board.getProperty(propId);
              return sum + (prop?.price ?? 0);
            }, 0);
            const tenPercent = Math.floor(totalWorth * INCOME_TAX_PERCENT);
            const fixed = 200;
            const payTenPercent = tenPercent < fixed;

            taxAmount = game.applyTax(currentAI, finalTile, payTenPercent);
            setLogs(prev => [...prev, `${currentAI.name} paid Income Tax: $${taxAmount} (chose ${payTenPercent ? '10%' : '$200'})`]);
            setMessage(`${currentAI.name} paid Income Tax: $${taxAmount}`);
          }
          forceUpdate();
          await new Promise(resolve => setTimeout(resolve, 400));
        }

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

            // Calculate rent (for utilities)
            let rentAmount = property.rent;
            if (property.color === "utility") {
              const ownerUtilities = owner?.properties.filter(propId => {
                const prop = game.board.getProperty(propId);
                return prop?.color === "utility";
              }).length || 0;
              const multiplier = ownerUtilities === 2 ? 10 : 4;
              rentAmount = roll.total * multiplier;
            }

            const success = game.payRent(currentAI.id, property.id, roll.total);
            if (success) {
              console.log(`[AI TURN] ${currentAI.name} paid $${rentAmount} rent to ${owner?.name}`);
              setLogs(prev => [...prev, `${currentAI.name} paid $${rentAmount} rent to ${owner?.name}`]);
              setMessage(`💸 ${currentAI.name} paid $${rentAmount} rent to ${owner?.name}`);

              // Check if human player received rent
              if (property.ownerId === '1') { // Human player is ID '1'
                setLastRentTransaction({ amount: rentAmount, receivedFrom: currentAI.name });
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

  // Winner modal
  if (gameWinner) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
            <h2 className="text-4xl font-bold mb-4">🏆 Game Over! 🏆</h2>
            <p className="text-2xl mb-4">{gameWinner} wins!</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-6 py-3 rounded font-bold hover:bg-blue-600"
            >
              New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = game.getCurrentPlayer();
  const humanTurn = isHumanTurn();

  // Check if current tile is a buyable property
  const currentTile = currentPlayer ? game.board.tiles[currentPlayer.position] : null;
  const canBuyProperty = Boolean(
    humanTurn &&
    !isProcessing &&
    canBuyCurrentProperty
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

            {/* Income Tax Choice */}
            {showIncomeTaxChoice && incomeTaxOptions && (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-lg shadow-lg">
                <div className="text-sm font-semibold mb-3 text-center">💸 Income Tax</div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleIncomeTaxChoice(true)}
                    className="w-full bg-white text-orange-600 font-bold py-2 px-4 rounded hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    Pay 10% (${incomeTaxOptions.tenPercent})
                  </button>
                  <button
                    onClick={() => handleIncomeTaxChoice(false)}
                    className="w-full bg-white text-orange-600 font-bold py-2 px-4 rounded hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    Pay $200
                  </button>
                </div>
              </div>
            )}

            {/* Jail Status / Pay Bail */}
            {currentPlayer && currentPlayer.inJail && humanTurn && (
              <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 rounded-lg shadow-lg">
                <div className="text-sm font-semibold mb-2 text-center">🚔 IN JAIL</div>
                <div className="text-xs text-center mb-3">
                  Turn {currentPlayer.jailTurns}/3 • Roll doubles or pay bail
                </div>
                <button
                  onClick={handlePayBail}
                  disabled={currentPlayer.money < BAIL_AMOUNT || isPayingBail}
                  className={`w-full font-bold py-2 px-4 rounded transition-all ${
                    currentPlayer.money >= BAIL_AMOUNT && !isPayingBail
                      ? 'bg-green-500 hover:bg-green-600 active:scale-95'
                      : 'bg-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPayingBail ? 'Paying...' : `Pay $${BAIL_AMOUNT} Bail`}
                </button>
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
              canEndTurn={hasRolled}
              disabled={!humanTurn || isProcessing}
              propertyPrice={buyableProperty?.price}
              propertyName={buyableProperty?.name}
            />
            <button
              onClick={() => setShowPropertyManagement(true)}
              disabled={!humanTurn || isProcessing || !currentPlayer?.properties.length}
              className="bg-purple-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 active:scale-95 transition-all w-full"
            >
              Manage Properties
            </button>
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

        {/* Property Management Modal */}
        {showPropertyManagement && currentPlayer && (() => {
          // Group properties by color for better organization
          const groupPropertiesByColor = () => {
            if (!currentPlayer) return {};

            const groups: { [color: string]: any[] } = {};
            currentPlayer.properties.forEach(propId => {
              const property = game!.board.getProperty(propId);
              if (!property) return;

              const color = property.color || 'other';
              if (!groups[color]) groups[color] = [];
              groups[color].push(property);
            });

            return groups;
          };

          // Get monopoly status for a color
          const getMonopolyStatus = (color: string): { hasMonopoly: boolean; owned: number; total: number } => {
            const colorGroupSizes: { [key: string]: number } = {
              'brown': 2, 'lightblue': 3, 'pink': 3, 'orange': 3,
              'red': 3, 'yellow': 3, 'green': 3, 'darkblue': 2,
              'railroad': 4, 'utility': 2
            };

            const total = colorGroupSizes[color] || 0;
            const owned = currentPlayer?.properties.filter(propId => {
              const prop = game!.board.getProperty(propId);
              return prop?.color === color;
            }).length || 0;

            return {
              hasMonopoly: owned === total && total > 0,
              owned,
              total
            };
          };

          return (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none backdrop-blur-sm">
            <div className="pointer-events-auto">
            <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">🏘️ Property Management</h3>
                <button
                  onClick={() => setShowPropertyManagement(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {currentPlayer && currentPlayer.properties.length === 0 && (
                <p className="text-gray-500 text-center py-8">You don&apos;t own any properties yet.</p>
              )}

              {currentPlayer && currentPlayer.properties.length > 0 && (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> You need a complete color monopoly to build houses.
                      Own all properties in a color group to unlock building!
                    </p>
                  </div>

                  {Object.entries(groupPropertiesByColor()).map(([color, properties]) => {
                    const monopolyStatus = getMonopolyStatus(color);
                    const colorDisplay = color === 'railroad' ? 'Railroads' :
                                       color === 'utility' ? 'Utilities' :
                                       color.charAt(0).toUpperCase() + color.slice(1);

                    const colorClasses: { [key: string]: string } = {
                      'brown': 'bg-amber-800',
                      'lightblue': 'bg-sky-300',
                      'pink': 'bg-pink-400',
                      'orange': 'bg-orange-500',
                      'red': 'bg-red-600',
                      'yellow': 'bg-yellow-400',
                      'green': 'bg-green-600',
                      'darkblue': 'bg-blue-800',
                      'railroad': 'bg-gray-800',
                      'utility': 'bg-gray-400'
                    };

                    return (
                      <div key={color} className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${colorClasses[color]} border-2 border-gray-300`}></div>
                            <h4 className="font-bold text-lg">{colorDisplay}</h4>
                            <span className="text-sm text-gray-600">
                              ({monopolyStatus.owned}/{monopolyStatus.total})
                            </span>
                            {monopolyStatus.hasMonopoly && color !== 'railroad' && color !== 'utility' && (
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                🎯 MONOPOLY
                              </span>
                            )}
                          </div>
                        </div>

                        {properties.map((property: any) => {
                          const canBuyHouse = game!.canBuyHouse(currentPlayer!.id, property.id);
                          const canBuyHotel = game!.canBuyHotel(currentPlayer!.id, property.id);

                          return (
                            <div key={property.id} className="ml-2 mb-2 p-3 bg-white border border-gray-200 rounded">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800">{property.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Base Rent: ${property.rent}
                                    {property.houses > 0 && ` | Current: 🏠 × ${property.houses}`}
                                    {property.hotels > 0 && ` | Current: 🏨`}
                                  </div>
                                  {!monopolyStatus.hasMonopoly && color !== 'railroad' && color !== 'utility' && (
                                    <div className="text-xs text-amber-600 mt-1">
                                      ⚠️ Need {monopolyStatus.total - monopolyStatus.owned} more {colorDisplay} {monopolyStatus.total - monopolyStatus.owned === 1 ? 'property' : 'properties'} to build
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 ml-4">
                                  {canBuyHouse && (
                                    <button
                                      onClick={() => handleBuyHouse(property.id)}
                                      className="bg-green-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-600 active:scale-95 transition-all whitespace-nowrap"
                                    >
                                      🏠 Build House (${property.houseCost})
                                    </button>
                                  )}
                                  {canBuyHotel && (
                                    <button
                                      onClick={() => handleBuyHotel(property.id)}
                                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                                    >
                                      🏨 Build Hotel (${property.hotelCost})
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {!monopolyStatus.hasMonopoly && color !== 'railroad' && color !== 'utility' && (
                          <div className="ml-2 mt-2 text-xs text-gray-500 italic">
                            Complete this color set to unlock building
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              <button
                onClick={() => setShowPropertyManagement(false)}
                className="w-full mt-4 bg-gray-600 text-white px-4 py-2 rounded font-medium hover:bg-gray-700 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
            </div>
          </div>
          );
        })()}

        {/* Card Modal */}
        {drawnCard && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none backdrop-blur-sm">
            <div className="pointer-events-auto">
              <div className="bg-white p-6 rounded-lg shadow-2xl max-w-md">
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">
                  {drawnCard.type === CardType.CHANCE ? '🎴 Chance' : '📦 Community Chest'}
                </h3>
                <p className="text-lg mb-6 text-center text-gray-700">{drawnCard.description}</p>
                <button
                  onClick={() => setDrawnCard(null)}
                  className="w-full bg-blue-500 text-white px-4 py-3 rounded font-bold hover:bg-blue-600 active:scale-95 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
