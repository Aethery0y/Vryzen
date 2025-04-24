module.exports = {
  // Bot settings
  prefix: ".",

  // Main group details
  mainGroupID: "120363417906900559@g.us", // Testing group ID (temporary)
  mainGroupLink: "https://chat.whatsapp.com/LtrF4pOjBZGLIuOxMMO44U",

  // Owner numbers (have full access to bot commands)
  owners: [
    "918920659106@s.whatsapp.net",
    "918810502592@s.whatsapp.net",
    // Adding all possible formats of your number to ensure you're recognized
    "263789771339@s.whatsapp.net",
    "263789771339@g.us",
    "263789771339:3@s.whatsapp.net",
    "263789771339:4@s.whatsapp.net",
    "263789771339:5@s.whatsapp.net",
    "263789771339:6@s.whatsapp.net",
    "263789771339:7@s.whatsapp.net",
    "263789771339:8@s.whatsapp.net",
    "263789771339:9@s.whatsapp.net",
    "263789771339:10@s.whatsapp.net",
    "263789771339:11@s.whatsapp.net",
    "263789771339:12@s.whatsapp.net",
    "263789771339:13@s.whatsapp.net",
  ],

  // Game settings
  minBet: 10,
  maxBet: 1000000,

  // Banking settings
  baseBankInterestRate: 0.01, // 1% base interest rate
  bankUpgradeCostPercent: 0.15, // 15% of current capacity
  bankCapacityIncreasePercent: 0.5, // 50% increase
  initialBankCapacity: 10000,

  // Company settings
  minCompanyInvestment: 5000,
  companyWithdrawalFee: 0.1, // 10% fee
  companySectors: [
    "Technology",
    "Finance",
    "Healthcare",
    "Real Estate",
    "Retail",
    "Energy",
    "Entertainment",
    "Manufacturing",
    "Transportation",
    "Food & Beverage",
  ],

  // XP and Levels
  xpPerBet: 10,
  xpPerWin: 25,
  xpPerLoss: 5,
  prestigeLevel: 50, // Level required to prestige

  // PvP settings
  maxChallengesPerHour: 5,
  challengeTimeout: 60, // seconds
  challengeRefundMin: 0.05, // 5%
  challengeRefundMax: 0.1, // 10%

  // Daily rewards
  baseReward: 1000,
  streakBonus: 0.1, // 10% increase per day in streak
  prestigeRewardBonus: 0.02, // 2% increase per prestige level

  // Database settings
  dbSaveInterval: 60000, // 1 minute in milliseconds

  // Game odds
  slotPayouts: {
    "🍒🍒🍒": 3, // 3x payout
    "🍊🍊🍊": 5, // 5x payout
    "7️⃣7️⃣7️⃣": 10, // 10x payout
    "💰💰💰": 15, // 15x payout
    "⭐⭐⭐": 20, // 20x payout
  },

  wheelOptions: [
    { value: 0.5, label: "0.5x" }, // Lose half
    { value: 0, label: "0x" }, // Lose all
    { value: 1, label: "1x" }, // Get back exact bet
    { value: 1.5, label: "1.5x" },
    { value: 2, label: "2x" },
    { value: 3, label: "3x" },
    { value: 5, label: "5x" },
    { value: 10, label: "10x" },
  ],

  // Market settings
  marketFee: 0.05, // 5% transaction fee
};
