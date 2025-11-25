import { GameEngine } from "../game";
import { Player, GameEventType } from "../types";
import { SimpleAI } from "./SimpleAI";
import { MediumAI } from "./MediumAI"; 

interface PlayerConfig {
  id: string;
  isHuman: boolean;
  aiInstance?: SimpleAI | MediumAI;
}

export class GameFlowManager {
  private game: GameEngine;
  private playerConfigs: PlayerConfig[];
  public isHumanTurn: boolean = false;
  private isGameRunning: boolean = true;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(gameEngine: GameEngine, aiCount: number = 1) {
    this.game = gameEngine;
    this.playerConfigs = [];

    this.game.players.forEach((player, index) => {
      const isHuman = index === 0; 
      this.playerConfigs.push({
        id: player.id,
        isHuman: isHuman,
        aiInstance: isHuman ? undefined : new MediumAI(),
      });
    });

    this.updateTurnStatus();
    this.setupGameEngineListeners();
  }

  public addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  private setupGameEngineListeners(): void {
    this.game.addEventListener('playerMoved', (data) => {
      this.emit('turnAction', { type: 'playerMoved', ...data });
    });

    this.game.addEventListener('propertyBought', (data) => {
      this.emit('turnAction', { type: 'propertyBought', ...data });
    });

    this.game.addEventListener('rentPaid', (data) => {
      this.emit('turnAction', { type: 'rentPaid', ...data });
    });

    this.game.addEventListener('playerJailed', (data) => {
      this.emit('turnAction', { type: 'playerJailed', ...data });
    });

    this.game.addEventListener('bailPaid', (data) => {
      this.emit('turnAction', { type: 'bailPaid', ...data });
    });

    this.game.addEventListener('playerReleased', (data) => {
      this.emit('turnAction', { type: 'playerReleased', ...data });
    });

    this.game.addEventListener('passGo', (data) => {
      this.emit('turnAction', { type: 'passGo', ...data });
    });
  }

  private updateTurnStatus(): void {
    const currentPlayer = this.game.getCurrentPlayer(); 
    if (!currentPlayer) {
      this.isGameRunning = false;
      return;
    }
    const config = this.playerConfigs.find((p) => p.id === currentPlayer.id);
    this.isHumanTurn = config?.isHuman || false;
  }

  public async executeTurn(): Promise<void> {
    if (!this.isGameRunning) {
      console.log("Jogo terminou.");
      this.emit('gameEnded', { reason: 'game_not_running' });
      return;
    }

    this.updateTurnStatus();
    const currentPlayer = this.game.getCurrentPlayer();
    if (!currentPlayer) {
      this.isGameRunning = false;
      this.emit('gameEnded', { reason: 'no_current_player' });
      return;
    }

    this.emit('turnStarted', {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      isHuman: this.isHumanTurn,
      inJail: currentPlayer.inJail
    });

    if (this.isHumanTurn) {
      console.log(`[Flow] Turno do Humano: ${currentPlayer.name}. Aguardando ação...`);
      this.emit('awaitingHumanAction', {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        inJail: currentPlayer.inJail
      });
    } else {
      console.log(`[Flow] Turno da IA: ${currentPlayer.name}. Executando...`);
      await this.executeAITurn(currentPlayer);
    }
  }

  private async executeAITurn(player: Player): Promise<void> {
    const config = this.playerConfigs.find((p) => p.id === player.id);
    if (!config || !config.aiInstance) return;

    this.emit('aiTurnStarted', { playerId: player.id, playerName: player.name });

    await new Promise(resolve => setTimeout(resolve, 500));

    let continuesTurn = true;
    while (continuesTurn) {
      const rollResult = this.game.rollAndMove();

      this.emit('diceRolled', {
        playerId: player.id,
        playerName: player.name,
        diceRoll: rollResult.diceRoll,
        jailStatus: rollResult.jailStatus
      });

      if (rollResult.moveResult) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const tile = rollResult.moveResult.tile;

        if (tile.property && !tile.property.ownerId && player.money >= tile.property.price) {
          const shouldBuy = this.shouldAIBuyProperty(config.aiInstance, tile.property, player);
          if (shouldBuy) {
            this.game.buyProperty(player.id, tile.property.id);
          }
        }

        if (tile.property && tile.property.ownerId && tile.property.ownerId !== player.id) {
          this.game.payRent(player.id, tile.property.id);
        }
      }

      continuesTurn = rollResult.continuesTurn && !player.inJail;

      if (continuesTurn) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    this.completeTurn();
  }

  private shouldAIBuyProperty(aiInstance: SimpleAI | MediumAI, property: any, player: Player): boolean {
    if ('shouldBuyProperty' in aiInstance && typeof aiInstance.shouldBuyProperty === 'function') {
      return aiInstance.shouldBuyProperty(property, player);
    }
    return player.money >= property.price * 2;
  }

  private completeTurn(): void {
    const currentPlayer = this.game.getCurrentPlayer();
    if (currentPlayer) {
      this.emit('turnEnded', {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        playerMoney: currentPlayer.money,
        playerPosition: currentPlayer.position
      });
    }

    this.game.nextTurn();
    this.executeTurn();
  }

  public handleHumanAction(action: string, payload?: any): boolean {
    if (!this.isHumanTurn) {
      console.warn("Não é o seu turno, ação ignorada.");
      this.emit('actionRejected', { reason: 'not_human_turn', action });
      return false;
    }

    const player = this.game.getCurrentPlayer();
    if (!player) return false;

    this.emit('humanActionAttempted', { playerId: player.id, action, payload });

    switch (action) {
      case "ROLL_DICE":
        return this.handleRollDice(player);

      case "BUY_PROPERTY":
        return this.handleBuyProperty(player, payload?.propertyId);

      case "PAY_BAIL":
        return this.handlePayBail(player);

      case "END_TURN":
        return this.handleEndTurn(player);

      default:
        console.warn(`Ação desconhecida: ${action}`);
        this.emit('actionRejected', { reason: 'unknown_action', action });
        return false;
    }
  }

  private handleRollDice(player: Player): boolean {
    console.log(`[Flow] Jogador(a) ${player.name} rolou os dados.`);

    const rollResult = this.game.rollAndMove();

    this.emit('diceRolled', {
      playerId: player.id,
      playerName: player.name,
      diceRoll: rollResult.diceRoll,
      jailStatus: rollResult.jailStatus
    });

    if (rollResult.moveResult) {
      console.log(`[Flow] Jogador(a) caiu em ${rollResult.moveResult.tile.name}`);
    }

    if (!rollResult.continuesTurn) {
      setTimeout(() => this.completeTurn(), 1000);
    }

    return true;
  }

  private handleBuyProperty(player: Player, propertyId?: number): boolean {
    if (!propertyId) return false;

    const bought = this.game.buyProperty(player.id, propertyId);

    this.emit('humanActionCompleted', {
      playerId: player.id,
      action: 'BUY_PROPERTY',
      success: bought,
      propertyId
    });

    return bought;
  }

  private handlePayBail(player: Player): boolean {
    if (!player.inJail) {
      this.emit('actionRejected', { reason: 'not_in_jail', action: 'PAY_BAIL' });
      return false;
    }

    const bailPaid = this.game.payBail(player.id);

    this.emit('humanActionCompleted', {
      playerId: player.id,
      action: 'PAY_BAIL',
      success: bailPaid
    });

    return bailPaid;
  }

  private handleEndTurn(player: Player): boolean {
    console.log(`[Flow] Jogador(a) ${player.name} terminou o turno.`);

    this.emit('humanActionCompleted', {
      playerId: player.id,
      action: 'END_TURN',
      success: true
    });

    this.completeTurn();
    return true;
  }
}