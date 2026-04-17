const Razorpay = require("razorpay");
const fs = require("fs");

const razorpay = new Razorpay({
    key_id: "rzp_live_SeYpUZQQ7stUhV",
    key_secret: "WojyaDH7ohRIeFdrsENR2BVY",
});

const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "8364091364:AAFkaIhar-d1-kmyc7ao2d49HBITmjGCoOc";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== START =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
👋 Welcome to AI Forex Pro

💰 Buy VIP here:

AI Forex Pro - Monthly VIP ₹4000  
https://rzp.io/rzp/Y25xVBG0

AI Forex Pro - BiMonthly VIP ₹6000  
https://rzp.io/rzp/OAXQNsA

AI Forex Pro - Quarterly VIP ₹8000  
https://rzp.io/rzp/4eNZIVS

AI Forex Pro - Half Yearly VIP ₹12000  
https://rzp.io/rzp/8021mrL9

AI Forex Pro - Yearly VIP ₹20000  
https://rzp.io/rzp/WVP9IjK

After payment:
👉 Send PAID
`);
});

// ===== HANDLE MESSAGES =====
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // STEP 1: PAID
    if (text.toLowerCase() === "paid") {
        bot.sendMessage(chatId, `
✅ Payment done!

Send your Payment ID (Example: RZP123456)
`);
        return;
    }

    // STEP 2: VERIFY PAYMENT
    if (text.startsWith("RZP")) {
        const paymentId = text.trim();

        try {
            const payment = await razorpay.payments.fetch(paymentId);
			
			// ===== PREVENT REUSE =====
let usedPayments = JSON.parse(fs.readFileSync("usedPayments.json"));

if (usedPayments.includes(paymentId)) {
    bot.sendMessage(chatId, "❌ This payment ID is already used.");
    return;
}

            if (payment.status !== "captured") {
                bot.sendMessage(chatId, "❌ Payment not completed.");
                return;
            }

            const amount = payment.amount / 100;

            let plan = "";
            let days = 0;

            // ===== YOUR 5 PLANS =====
            if (amount === 4000) {
                plan = "MONTHLY";
                days = 30;
            } 
            else if (amount === 6000) {
                plan = "BIMONTHLY";
                days = 60;
            } 
            else if (amount === 8000) {
                plan = "QUARTERLY";
                days = 90;
            } 
            else if (amount === 12000) {
                plan = "HALF YEARLY";
                days = 180;
            } 
            else if (amount === 20000) {
                plan = "YEARLY";
                days = 365;
            } 
            else {
                bot.sendMessage(chatId, "❌ Payment amount not matching any plan.");
                return;
            }

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + days);

            let users = JSON.parse(fs.readFileSync("users.json"));

            users.push({
                chatId,
                plan,
                expiry
            });

            fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
			// Mark payment as used
usedPayments.push(paymentId);
fs.writeFileSync("usedPayments.json", JSON.stringify(usedPayments, null, 2));

            bot.sendMessage(chatId, `
🎉 VIP Access Activated!

📦 Plan: ${plan}
📅 Expiry: ${expiry.toDateString()}

👉 Join VIP:
https://t.me/+iIMQZ78tOEkxYTY1
`);

        } catch (err) {
            console.log(err);
            bot.sendMessage(chatId, "❌ Invalid Payment ID or not found.");
        }
    }
});