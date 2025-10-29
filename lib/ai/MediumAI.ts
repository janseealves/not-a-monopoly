import { SimpleAI } from "./SimpleAI";
import { AIStrategy } from "./AIDecisions"; 

export class MediumAI extends SimpleAI {
  constructor() {
    super(AIStrategy.AGGRESSIVE);
  }
}