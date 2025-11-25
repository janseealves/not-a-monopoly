import { GameEngine } from "../game";
import { Player } from "../types"; 
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
      return;
    }

    this.updateTurnStatus();
    const currentPlayer = this.game.getCurrentPlayer();
    if (!currentPlayer) return;

    if (this.isHumanTurn) {
      console.log(`[Flow] Turno do Humano: ${currentPlayer.name}. Aguardando ação...`);
    } else {
      console.log(`[Flow] Turno da IA: ${currentPlayer.name}. Executando...`);
      const config = this.playerConfigs.find((p) => p.id === currentPlayer.id);
      if (config && config.aiInstance) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        config.aiInstance.executeTurn(this.game); 
        
        this.executeTurn(); 
      }
    }
  }

  public handleHumanAction(action: string, payload?: any): boolean {
    if (!this.isHumanTurn) {
      console.warn("Não é o seu turno, ação ignorada.");
      return false;
    }

    const player = this.game.getCurrentPlayer();
    if (!player) return false;
    
    let turnEnded = false;

    switch (action) {
      case "ROLL_DICE":
        console.log(`[Flow] Jogador(a) ${player.name} rolou os dados.`);
        const diceRoll = this.game.rollDice();
        const moveResult = this.game.moveCurrentPlayer(diceRoll.total);
        console.log(`[Flow] Jogador(a) caiu em ${moveResult?.tile.name}`);
        break;

      case "END_TURN":
        console.log(`[Flow] Jogador(a) ${player.name} terminou o turno.`);
        this.game.nextTurn(); 
        turnEnded = true;
        break;

      default:
        console.warn(`Ação desconhecida: ${action}`);
        return false;
    }

    if (turnEnded) {
      this.executeTurn();
    }
    
    return true;
  }
}