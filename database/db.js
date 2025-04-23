const fs = require('fs');
const path = require('path');

// In-memory database
let db = {
  users: {},       // User profiles, balances, XP, levels
  usernames: {},   // Maps usernames to user IDs
  companies: {},   // Company data
  market: {        // Market orders
    orders: []     // List of sell orders
  },
  pvp: {           // PvP challenges
    challenges: {} // Active challenges
  },
  jackpot: {       // Jackpot data
    entries: [],
    totalAmount: 0,
    lastDrawTime: null
  },
  stats: {         // Global stats
    totalBets: 0,
    totalWagered: 0,
    totalWon: 0,
    totalLost: 0
  },
  groups: {        // Group data
    approved: {}   // Approved groups where bot can function
  }
};

// Database file path
const DB_PATH = path.join(__dirname, '../data/database.json');

// Ensure the data directory exists
function ensureDirectoryExists() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Initialize the database
function initializeDatabase() {
  ensureDirectoryExists();
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(data);
      console.log('Database loaded successfully');
    } else {
      saveDatabase();
      console.log('New database created');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Save the database to file
function saveDatabase() {
  ensureDirectoryExists();
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// User functions
function getUser(userId) {
  if (!db.users[userId]) {
    // Create new user if not exists
    db.users[userId] = {
      id: userId,
      username: null, // Will be set during registration
      isRegistered: false, // User needs to register
      balance: 1000, // Starting balance
      bankBalance: 0,
      bankCapacity: 10000,
      xp: 0,
      level: 1,
      prestige: 0,
      lastDailyReward: null,
      dailyStreak: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      investedCompanies: {},
      shares: {},
      challengesMade: 0,
      lastChallengeTime: null,
      lastOpponent: null,
      joinDate: Date.now()
    };
  }
  
  return db.users[userId];
}

function getAllUsers() {
  return Object.values(db.users);
}

function updateUser(userId, updates) {
  db.users[userId] = { ...db.users[userId], ...updates };
  return db.users[userId];
}

// Username functions
function isUsernameAvailable(username) {
  // Initialize usernames object if it doesn't exist
  if (!db.usernames) {
    db.usernames = {};
  }
  
  // Check if username already exists
  return !db.usernames[username.toLowerCase()];
}

function registerUsername(userId, username) {
  // Normalize the username to lowercase for storage
  const normalizedUsername = username.toLowerCase();
  
  // Check if already registered
  if (db.usernames[normalizedUsername]) {
    return false; // Username already taken
  }
  
  // Store username to user mapping
  db.usernames[normalizedUsername] = userId;
  
  // Update user record
  updateUser(userId, { 
    username: username, // Store the original username (with case preserved)
    isRegistered: true
  });
  
  return true;
}

function getUserByUsername(username) {
  // Initialize usernames object if it doesn't exist
  if (!db.usernames) {
    db.usernames = {};
    return null;
  }
  
  // Normalize to lowercase for lookup
  const normalizedUsername = username.toLowerCase();
  const userId = db.usernames[normalizedUsername];
  
  if (!userId) {
    return null; // Username not found
  }
  
  return getUser(userId);
}

function isUserRegistered(userId) {
  const user = getUser(userId);
  return user.isRegistered;
}

// Company functions
function getCompany(name) {
  return db.companies[name];
}

function getAllCompanies() {
  return Object.values(db.companies);
}

function createCompany(name, owner, initialInvestment) {
  const sectors = require('../config').companySectors;
  const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
  
  db.companies[name] = {
    name,
    owner,
    sector: randomSector,
    value: initialInvestment,
    investors: {
      [owner]: initialInvestment
    },
    createdAt: Date.now(),
    totalShares: 100, // Initial shares
    shareDistribution: {
      [owner]: 100 // Owner owns 100% initially
    }
  };
  
  return db.companies[name];
}

function updateCompany(name, updates) {
  if (db.companies[name]) {
    db.companies[name] = { ...db.companies[name], ...updates };
  }
  return db.companies[name];
}

// Market functions
function getMarketOrders(company = null) {
  if (company) {
    return db.market.orders.filter(order => order.company === company);
  }
  return db.market.orders;
}

function addMarketOrder(order) {
  order.id = Date.now() + Math.floor(Math.random() * 1000); // Unique ID
  order.createdAt = Date.now();
  
  db.market.orders.push(order);
  return order;
}

function getMarketOrderById(orderId) {
  return db.market.orders.find(order => order.id === orderId);
}

function removeMarketOrder(orderId) {
  const index = db.market.orders.findIndex(order => order.id === orderId);
  if (index !== -1) {
    db.market.orders.splice(index, 1);
    return true;
  }
  return false;
}

// PvP functions
function createChallenge(challengerId, opponentId, amount) {
  const challengeId = `${challengerId}_${opponentId}_${Date.now()}`;
  
  db.pvp.challenges[challengeId] = {
    id: challengeId,
    challenger: challengerId,
    opponent: opponentId,
    amount,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + (require('../config').challengeTimeout * 1000)
  };
  
  return db.pvp.challenges[challengeId];
}

function getChallenge(challengeId) {
  return db.pvp.challenges[challengeId];
}

function getPendingChallengesForUser(userId) {
  return Object.values(db.pvp.challenges).filter(
    challenge => 
      challenge.status === 'pending' && 
      challenge.opponent === userId
  );
}

function updateChallenge(challengeId, updates) {
  if (db.pvp.challenges[challengeId]) {
    db.pvp.challenges[challengeId] = { 
      ...db.pvp.challenges[challengeId], 
      ...updates 
    };
  }
  return db.pvp.challenges[challengeId];
}

function cleanupExpiredChallenges() {
  const now = Date.now();
  Object.entries(db.pvp.challenges).forEach(([id, challenge]) => {
    if (challenge.status === 'pending' && challenge.expiresAt < now) {
      db.pvp.challenges[id].status = 'expired';
    }
  });
}

// Jackpot functions
function addJackpotEntry(userId, amount) {
  db.jackpot.entries.push({
    userId,
    amount,
    enteredAt: Date.now(),
    tickets: amount // 1 coin = 1 ticket
  });
  
  db.jackpot.totalAmount += amount;
  return db.jackpot.entries;
}

function getJackpotEntries() {
  return db.jackpot.entries;
}

function resetJackpot() {
  const previousJackpot = { ...db.jackpot };
  
  db.jackpot = {
    entries: [],
    totalAmount: 0,
    lastDrawTime: Date.now(),
    previousWinner: previousJackpot.winner,
    previousAmount: previousJackpot.totalAmount
  };
  
  return previousJackpot;
}

// Stats functions
function updateGlobalStats(stats) {
  db.stats = { ...db.stats, ...stats };
  return db.stats;
}

function getGlobalStats() {
  return db.stats;
}

// Group functions
function approveGroup(groupId, metadata = {}) {
  if (!db.groups.approved) {
    db.groups.approved = {};
  }
  
  db.groups.approved[groupId] = {
    id: groupId,
    approvedAt: Date.now(),
    name: metadata.name || null,
    ...metadata
  };
  
  return db.groups.approved[groupId];
}

function removeGroupApproval(groupId) {
  if (db.groups.approved && db.groups.approved[groupId]) {
    delete db.groups.approved[groupId];
    return true;
  }
  return false;
}

function isGroupApproved(groupId) {
  // Make sure the groups and approved objects exist
  if (!db.groups) {
    db.groups = { approved: {} };
  }
  if (!db.groups.approved) {
    db.groups.approved = {};
  }
  
  // Allow the official Vryzen group (add its ID here)
  const VRYZEN_GROUP_ID = "120363199732269855@g.us"; // Replace with actual ID
  if (groupId === VRYZEN_GROUP_ID) {
    // Auto-approve the Vryzen group if not already approved
    if (!db.groups.approved[VRYZEN_GROUP_ID]) {
      approveGroup(VRYZEN_GROUP_ID, { name: "Vryzen Official", isMain: true });
      saveDatabase();
    }
    return true;
  }
  
  // Check if this group is approved
  return !!db.groups.approved[groupId];
}

function getAllApprovedGroups() {
  return db.groups.approved ? Object.values(db.groups.approved) : [];
}

// Export all functions
module.exports = {
  initializeDatabase,
  saveDatabase,
  getUser,
  getAllUsers,
  updateUser,
  isUsernameAvailable,
  registerUsername,
  getUserByUsername,
  isUserRegistered,
  getCompany,
  getAllCompanies,
  createCompany,
  updateCompany,
  getMarketOrders,
  addMarketOrder,
  getMarketOrderById,
  removeMarketOrder,
  createChallenge,
  getChallenge,
  getPendingChallengesForUser,
  updateChallenge,
  cleanupExpiredChallenges,
  addJackpotEntry,
  getJackpotEntries,
  resetJackpot,
  updateGlobalStats,
  getGlobalStats,
  approveGroup,
  removeGroupApproval,
  isGroupApproved,
  getAllApprovedGroups,
  db // Export db for direct access (careful with this)
};
