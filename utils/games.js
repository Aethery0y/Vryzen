/**
 * Performs a coin toss
 * @returns {String} 'heads' or 'tails'
 */
function coinToss() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

/**
 * Rolls a dice
 * @returns {Number} 1-6
 */
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Plays slots
 * @returns {Object} Slot results and payout info
 */
function playSlots() {
  // Define symbols and their probabilities
  const symbols = ['🍒', '🍊', '🍋', '7️⃣', '💰', '⭐'];
  const weights = [0.3, 0.25, 0.2, 0.15, 0.07, 0.03]; // Probabilities add up to 1
  
  // Initialize the display grid (3x3)
  const display = [
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
  ];
  
  // Check for wins (middle row)
  const middleRow = display[1];
  let win = false;
  let multiplier = 0;
  
  // Check if all symbols in middle row are the same
  if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
    win = true;
    
    // Set multiplier based on symbol
    switch (middleRow[0]) {
      case '🍒': multiplier = 3; break;
      case '🍊': multiplier = 5; break;
      case '🍋': multiplier = 7; break;
      case '7️⃣': multiplier = 10; break;
      case '💰': multiplier = 15; break;
      case '⭐': multiplier = 20; break;
    }
  }
  
  return { display, win, multiplier };
  
  // Helper function to get random symbol based on probabilities
  function getRandomSymbol() {
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < symbols.length; i++) {
      cumulativeProbability += weights[i];
      if (rand < cumulativeProbability) {
        return symbols[i];
      }
    }
    
    return symbols[0]; // Fallback
  }
}

/**
 * Spins the wheel of fortune
 * @returns {Object} Wheel result object with multiplier and label
 */
function spinWheel() {
  // Define wheel options with their probabilities
  const options = [
    { value: 0, label: '0x', weight: 0.15 },    // 15% chance to lose all
    { value: 0.5, label: '0.5x', weight: 0.20 }, // 20% chance to lose half
    { value: 1, label: '1x', weight: 0.25 },     // 25% chance to get exact bet back
    { value: 1.5, label: '1.5x', weight: 0.20 }, // 20% chance to win 1.5x
    { value: 2, label: '2x', weight: 0.10 },     // 10% chance to win 2x
    { value: 3, label: '3x', weight: 0.05 },     // 5% chance to win 3x
    { value: 5, label: '5x', weight: 0.03 },     // 3% chance to win 5x
    { value: 10, label: '10x', weight: 0.02 }    // 2% chance to win 10x
  ];
  
  // Calculate total weight
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  
  // Spin the wheel
  let random = Math.random() * totalWeight;
  let currentWeight = 0;
  
  for (const option of options) {
    currentWeight += option.weight;
    if (random <= currentWeight) {
      return {
        multiplier: option.value,
        label: option.label
      };
    }
  }
  
  // Fallback
  return { multiplier: 1, label: '1x' };
}

/**
 * Deals a blackjack hand
 * @returns {Object} Blackjack hand object with player and dealer hands
 */
function dealBlackjackHand() {
  // Create a deck
  const deck = createDeck();
  
  // Shuffle the deck
  shuffleDeck(deck);
  
  // Deal initial cards
  const playerHand = [drawCard(deck), drawCard(deck)];
  const dealerHand = [drawCard(deck), drawCard(deck)];
  
  // Calculate initial hand values
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  
  return {
    playerHand,
    dealerHand,
    deck,
    playerValue,
    dealerValue
  };
}

/**
 * Hits in blackjack (adds a card to player's hand)
 * @param {Array} playerHand - Player's hand
 * @param {Array} deck - Deck of cards
 * @returns {Object} Card drawn
 */
function hitBlackjack(playerHand, deck = null) {
  // If no deck provided, create a new one
  if (!deck) {
    deck = createDeck();
    shuffleDeck(deck);
  }
  
  // Draw a card and add to the player's hand
  const card = drawCard(deck);
  playerHand.push(card);
  
  return card;
}

/**
 * Stands in blackjack (dealer plays)
 * @param {Array} dealerHand - Dealer's hand
 * @param {Array} deck - Deck of cards
 */
function standBlackjack(dealerHand, deck = null) {
  // If no deck provided, create a new one
  if (!deck) {
    deck = createDeck();
    shuffleDeck(deck);
  }
  
  // Dealer keeps hitting until 17 or higher
  while (calculateHandValue(dealerHand) < 17) {
    dealerHand.push(drawCard(deck));
  }
}

/**
 * Calculate blackjack hand value
 * @param {Array} hand - Array of cards
 * @returns {Number} Hand value
 */
function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    const cardVal = card.value;
    if (cardVal === 'A') {
      aces++;
      value += 11;
    } else if (cardVal === 'K' || cardVal === 'Q' || cardVal === 'J') {
      value += 10;
    } else {
      value += parseInt(cardVal);
    }
  }
  
  // Adjust for aces if needed
  while (value > 21 && aces > 0) {
    value -= 10; // Convert an ace from 11 to 1
    aces--;
  }
  
  return value;
}

/**
 * Creates a standard deck of 52 cards
 * @returns {Array} Deck of cards
 */
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  return deck;
}

/**
 * Shuffles a deck of cards
 * @param {Array} deck - Deck to shuffle
 */
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/**
 * Draws a card from a deck
 * @param {Array} deck - Deck to draw from
 * @returns {Object} Card drawn
 */
function drawCard(deck) {
  if (deck.length === 0) {
    // If deck is empty, create a new shuffled deck
    const newDeck = createDeck();
    shuffleDeck(newDeck);
    deck.push(...newDeck);
  }
  
  return deck.pop();
}

/**
 * Simulates a jackpot draw
 * @param {Array} entries - Jackpot entries
 * @returns {Object} Winner entry
 */
function drawJackpot(entries) {
  if (entries.length === 0) {
    return null;
  }
  
  // Calculate total tickets
  const totalTickets = entries.reduce((sum, entry) => sum + entry.tickets, 0);
  
  // Draw a random ticket
  const winningTicket = Math.floor(Math.random() * totalTickets) + 1;
  
  // Find the winner
  let ticketCounter = 0;
  for (const entry of entries) {
    ticketCounter += entry.tickets;
    if (winningTicket <= ticketCounter) {
      return entry;
    }
  }
  
  // Fallback (should never happen)
  return entries[0];
}

module.exports = {
  coinToss,
  rollDice,
  playSlots,
  spinWheel,
  dealBlackjackHand,
  hitBlackjack,
  standBlackjack,
  calculateHandValue,
  drawJackpot
};
