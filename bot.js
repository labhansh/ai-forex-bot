const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "8364091364:AAFkaIhar-d1-kmyc7ao2d49HBITmjGCoOc";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
👋 Welcome to AI Forex Pro

💰 Buy VIP here:

AI Forex Pro - Monthly VIP ₹4000  
https://rzp.io/rzp/Y25xVBG0

AI Forex Pro - BiMonthly VIP ₹6000  
https://rzp.io/rzp/OAXQNsA

AI Forex Pro - Quartely VIP ₹8000  
https://rzp.io/rzp/4eNZIVS

AI Forex Pro - Half Yearly VIP ₹12000  
https://rzp.io/rzp/8021mrL9

AI Forex Pro - Yearly VIP ₹20000  
https://rzp.io/rzp/WVP9IjK


After payment:
👉 Send PAID
`);
});

// Handle PAID
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text.toLowerCase() === "paid") {
        bot.sendMessage(chatId, `
✅ Payment done!

Send your Payment ID (Example: RZP123456)
`);
        return;
    }

    if (text.startsWith("RZP")) {

        bot.sendMessage(chatId, `
🎉 VIP Access Granted!

👉 Join here:
https://t.me/+iIMQZ78tOEkxYTY1
`);
    }
});