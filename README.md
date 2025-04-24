# WhatsApp Economy Bot

A feature-rich WhatsApp bot built with Baileys that implements a complete economy system with gambling, banking, companies, and more.

## Features

- 💰 Complete economy system with coins and banking
- 🎲 Gambling games (coin toss, dice, slots, blackjack, wheel spin)
- 🏢 Company system with investments and shares
- 💳 Banking system with interest and upgrades
- 📈 XP and leveling system with prestige
- 👥 Group management and permissions
- 🎯 Daily rewards and streaks
- 👑 Owner commands for administration

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsapp-economy-bot.git
cd whatsapp-economy-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `config.js` file in the root directory with your settings:
```javascript
module.exports = {
  prefix: ".", // Bot command prefix
  owners: [
    "your-number@s.whatsapp.net" // Add your WhatsApp number here
  ],
  // Other config options...
};
```

4. Start the bot:
```bash
node index.js
```

5. Scan the QR code with WhatsApp to connect the bot.

## Commands

### General Commands
- `.help` - Show all commands
- `.register` - Register to use the bot
- `.balance` - Check your balance
- `.profile` - View your profile

### Gambling Commands
- `.cointoss [amount] [heads/tails]` - Bet on coin toss
- `.dice [amount]` - Roll dice
- `.slots [amount]` - Play slots
- `.blackjack [amount]` - Play blackjack
- `.wheelspin [amount]` - Spin the wheel
- `.jackpot [amount]` - Enter the jackpot

### Banking Commands
- `.deposit [amount]` - Deposit coins to bank
- `.withdraw [amount]` - Withdraw coins from bank
- `.interest` - Claim daily interest
- `.bank-upgrade` - Upgrade bank capacity
- `.bank` - View bank information

### Company Commands
- `.createcompany [amount] [name]` - Create a company
- `.companyinfo [name]` - View company info
- `.companyinvest [amount] [name]` - Invest in company
- `.companywithdraw [amount] [name]` - Withdraw from company

### Owner Commands
- `.blacklist [username]` - Blacklist a user
- `.unblacklist [username]` - Remove user from blacklist
- `.addcoins [username] [amount]` - Add coins to user
- `.removecoins [username] [amount]` - Remove coins from user
- `.makeowner [username]` - Make user an owner
- `.removeowner [username]` - Remove owner status
- `.setxp [username] [amount]` - Set user's XP
- `.resetdata` - Reset all data
- `.resetalldata` - Complete database wipe

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- Inspired by various economy bots and games 