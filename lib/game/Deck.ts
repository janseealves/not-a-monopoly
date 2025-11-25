import { Card, CardType } from "../types";

export class Deck {
  private cards: Card[];
  private discardPile: Card[];
  private type: CardType;

  constructor(type: CardType) {
    this.type = type;
    this.cards = this.createDeck(type);
    this.discardPile = [];
    this.shuffle();
  }

  private createDeck(type: CardType): Card[] {
    if (type === CardType.CHANCE) {
      return this.createChanceDeck();
    } else {
      return this.createCommunityChestDeck();
    }
  }

  private createChanceDeck(): Card[] {
    return [
      { id: 1, type: CardType.CHANCE, description: "Advance to GO (Collect $200)", action: { type: 'MOVE_TO', position: 0 } },
      { id: 2, type: CardType.CHANCE, description: "Advance to Illinois Avenue", action: { type: 'MOVE_TO', position: 24 } },
      { id: 3, type: CardType.CHANCE, description: "Advance to St. Charles Place", action: { type: 'MOVE_TO', position: 11 } },
      { id: 4, type: CardType.CHANCE, description: "Advance token to nearest Utility", action: { type: 'MOVE_TO', position: 12 } },
      { id: 5, type: CardType.CHANCE, description: "Advance token to nearest Railroad", action: { type: 'MOVE_TO', position: 5 } },
      { id: 6, type: CardType.CHANCE, description: "Bank pays you dividend of $50", action: { type: 'COLLECT', amount: 50 } },
      { id: 7, type: CardType.CHANCE, description: "Get Out of Jail Free", action: { type: 'GET_OUT_OF_JAIL_FREE' } },
      { id: 8, type: CardType.CHANCE, description: "Go Back 3 Spaces", action: { type: 'GO_BACK', spaces: 3 } },
      { id: 9, type: CardType.CHANCE, description: "Go to Jail", action: { type: 'GO_TO_JAIL' } },
      { id: 10, type: CardType.CHANCE, description: "Make general repairs on all your property ($25 per house, $100 per hotel)", action: { type: 'PAY_PER_HOUSE', houseAmount: 25, hotelAmount: 100 } },
      { id: 11, type: CardType.CHANCE, description: "Pay poor tax of $15", action: { type: 'PAY', amount: 15 } },
      { id: 12, type: CardType.CHANCE, description: "Take a trip to Reading Railroad", action: { type: 'MOVE_TO', position: 5 } },
      { id: 13, type: CardType.CHANCE, description: "Take a walk on the Boardwalk", action: { type: 'MOVE_TO', position: 39 } },
      { id: 14, type: CardType.CHANCE, description: "You have been elected Chairman of the Board (Pay each player $50)", action: { type: 'PAY_TO_PLAYERS', amount: 50 } },
      { id: 15, type: CardType.CHANCE, description: "Your building loan matures (Collect $150)", action: { type: 'COLLECT', amount: 150 } },
      { id: 16, type: CardType.CHANCE, description: "You have won a crossword competition (Collect $100)", action: { type: 'COLLECT', amount: 100 } },
    ];
  }

  private createCommunityChestDeck(): Card[] {
    return [
      { id: 101, type: CardType.COMMUNITY_CHEST, description: "Advance to GO (Collect $200)", action: { type: 'MOVE_TO', position: 0 } },
      { id: 102, type: CardType.COMMUNITY_CHEST, description: "Bank error in your favor (Collect $200)", action: { type: 'COLLECT', amount: 200 } },
      { id: 103, type: CardType.COMMUNITY_CHEST, description: "Doctor's fees (Pay $50)", action: { type: 'PAY', amount: 50 } },
      { id: 104, type: CardType.COMMUNITY_CHEST, description: "From sale of stock you get $50", action: { type: 'COLLECT', amount: 50 } },
      { id: 105, type: CardType.COMMUNITY_CHEST, description: "Get Out of Jail Free", action: { type: 'GET_OUT_OF_JAIL_FREE' } },
      { id: 106, type: CardType.COMMUNITY_CHEST, description: "Go to Jail", action: { type: 'GO_TO_JAIL' } },
      { id: 107, type: CardType.COMMUNITY_CHEST, description: "Grand Opera Night (Collect $50 from every player)", action: { type: 'COLLECT_FROM_PLAYERS', amount: 50 } },
      { id: 108, type: CardType.COMMUNITY_CHEST, description: "Holiday Fund matures (Receive $100)", action: { type: 'COLLECT', amount: 100 } },
      { id: 109, type: CardType.COMMUNITY_CHEST, description: "Income tax refund (Collect $20)", action: { type: 'COLLECT', amount: 20 } },
      { id: 110, type: CardType.COMMUNITY_CHEST, description: "It is your birthday (Collect $10 from each player)", action: { type: 'COLLECT_FROM_PLAYERS', amount: 10 } },
      { id: 111, type: CardType.COMMUNITY_CHEST, description: "Life insurance matures (Collect $100)", action: { type: 'COLLECT', amount: 100 } },
      { id: 112, type: CardType.COMMUNITY_CHEST, description: "Hospital fees (Pay $100)", action: { type: 'PAY', amount: 100 } },
      { id: 113, type: CardType.COMMUNITY_CHEST, description: "School fees (Pay $150)", action: { type: 'PAY', amount: 150 } },
      { id: 114, type: CardType.COMMUNITY_CHEST, description: "Receive $25 consultancy fee", action: { type: 'COLLECT', amount: 25 } },
      { id: 115, type: CardType.COMMUNITY_CHEST, description: "You are assessed for street repairs ($40 per house, $115 per hotel)", action: { type: 'PAY_PER_HOUSE', houseAmount: 40, hotelAmount: 115 } },
      { id: 116, type: CardType.COMMUNITY_CHEST, description: "You have won second prize in a beauty contest (Collect $10)", action: { type: 'COLLECT', amount: 10 } },
      { id: 117, type: CardType.COMMUNITY_CHEST, description: "You inherit $100", action: { type: 'COLLECT', amount: 100 } },
    ];
  }

  shuffle(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(): Card | null {
    if (this.cards.length === 0) {
      // Reshuffle discard pile back into deck
      this.cards = [...this.discardPile];
      this.discardPile = [];
      this.shuffle();
    }

    const card = this.cards.pop();
    if (card && card.action.type !== 'GET_OUT_OF_JAIL_FREE') {
      // Regular cards go to discard pile
      this.discardPile.push(card);
    }
    // Get Out of Jail Free cards are held by player, not discarded
    return card || null;
  }

  returnCard(card: Card): void {
    // When player uses Get Out of Jail Free card, return it to discard pile
    this.discardPile.push(card);
  }
}

export default Deck;
