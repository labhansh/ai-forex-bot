const VIP_CHAT_ID = -1003710328560;
const ADMIN_ID = 1867730623;

const Razorpay = require("razorpay");
const fs = require("fs");

const razorpay = new Razorpay({
    key_id: "rzp_live_SeYpUZQQ7stUhV",
    key_secret: "WojyaDH7ohRIeFdrsENR2BVY",
});

const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = "8364091364:AAFkaIhar-d1-kmyc7ao2d49HBITmjGCoOc";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== FILE SAFETY =====
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");
if (!fs.existsSync("usedPayments.json")) fs.writeFileSync("usedPayments.json", "[]");
if (!fs.existsSync("conversions.json")) fs.writeFileSync("conversions.json", "[]");

// ===== START =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
👋 Welcome to AI Forex Pro

💰 Buy VIP here:

Monthly ₹4000  
https://rzp.io/rzp/Y25xVBG0

BiMonthly ₹6000  
https://rzp.io/rzp/OAXQNsA

Quarterly ₹8000  
https://rzp.io/rzp/4eNZIVS

Half Yearly ₹12000  
https://rzp.io/rzp/8021mrL9

Yearly ₹20000  
https://rzp.io/rzp/WVP9IjK

👉 After payment send: PAID
`);
});

// ===== HANDLE MESSAGES =====
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text.toLowerCase() === "paid") {
        bot.sendMessage(chatId, "Send your Payment ID (RZPXXXX)");
        return;
    }

    if (text.startsWith("RZP")) {
        const paymentId = text.trim();

        try {
            const payment = await razorpay.payments.fetch(paymentId);

            let usedPayments = JSON.parse(fs.readFileSync("usedPayments.json"));
            if (usedPayments.includes(paymentId)) {
                return bot.sendMessage(chatId, "❌ Already used payment ID");
            }

            if (payment.status !== "captured") {
                return bot.sendMessage(chatId, "❌ Payment not completed");
            }

            const amount = payment.amount / 100;

            let plan = "", days = 0;

            if (amount === 4000) { plan = "MONTHLY"; days = 30; }
            else if (amount === 6000) { plan = "BIMONTHLY"; days = 60; }
            else if (amount === 8000) { plan = "QUARTERLY"; days = 90; }
            else if (amount === 12000) { plan = "HALF YEARLY"; days = 180; }
            else if (amount === 20000) { plan = "YEARLY"; days = 365; }
            else return bot.sendMessage(chatId, "❌ Invalid plan");

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + days);

            let users = JSON.parse(fs.readFileSync("users.json"));
            users.push({ chatId, plan, expiry });
            fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

            usedPayments.push(paymentId);
            fs.writeFileSync("usedPayments.json", JSON.stringify(usedPayments, null, 2));

            // Conversion tracking
            let conversions = JSON.parse(fs.readFileSync("conversions.json"));
            conversions.push({ chatId, plan, amount, date: new Date() });
            fs.writeFileSync("conversions.json", JSON.stringify(conversions, null, 2));

            // VIP access
            bot.sendMessage(chatId, `
🎉 VIP Activated

Plan: ${plan}
Expiry: ${expiry.toDateString()}

👉 https://t.me/+iIMQZ78tOEkxYTY1
`, {
                reply_markup: {
                    inline_keyboard: [[{ text: "🔁 Renew", url: "https://rzp.io/rzp/Y25xVBG0" }]]
                }
            });

            // onboarding
            setTimeout(() => {
                bot.sendMessage(chatId, "📊 Follow entry, TP & SL. Use proper risk.");
            }, 5000);

            // upsell
            setTimeout(() => {
                bot.sendMessage(chatId, "🔥 Upgrade to Yearly 👉 https://rzp.io/rzp/WVP9IjK");
            }, 15000);

        } catch {
            bot.sendMessage(chatId, "❌ Invalid Payment ID");
        }
    }
});

// ===== AUTO REMOVE =====
setInterval(async () => {
    let users = JSON.parse(fs.readFileSync("users.json"));
    const now = new Date();
    let updated = [];

    for (let u of users) {
        if (new Date(u.expiry) < now) {
            try {
                await bot.banChatMember(VIP_CHAT_ID, u.chatId);
                await bot.unbanChatMember(VIP_CHAT_ID, u.chatId);
            } catch {}
        } else updated.push(u);
    }

    fs.writeFileSync("users.json", JSON.stringify(updated, null, 2));
}, 3600000);

// ===== REMINDER =====
setInterval(async () => {
    let users = JSON.parse(fs.readFileSync("users.json"));
    const now = new Date();

    for (let u of users) {
        let diff = new Date(u.expiry) - now;
        if (diff > 0 && diff < 86400000) {
            await bot.sendMessage(u.chatId, "⏰ Expiring soon! Renew now.");
        }
    }
}, 21600000);

// ===== STATS =====
bot.onText(/\/stats/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;

    let users = JSON.parse(fs.readFileSync("users.json"));
    bot.sendMessage(msg.chat.id, `Users: ${users.length}`);
});

// ===== BROADCAST =====
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) return;

    let users = JSON.parse(fs.readFileSync("users.json"));
    const now = new Date();

    for (let u of users) {
        if (new Date(u.expiry) < now) continue;
        try { await bot.sendMessage(u.chatId, match[1]); } catch {}
        await new Promise(r => setTimeout(r, 50));
    }
});

// ===== EXPIRED USERS =====
bot.onText(/\/expired (.+)/, async (msg, match) => {
    if (msg.chat.id !== ADMIN_ID) return;

    let users = JSON.parse(fs.readFileSync("users.json"));
    const now = new Date();

    for (let u of users) {
        if (new Date(u.expiry) > now) continue;
        try { await bot.sendMessage(u.chatId, match[1]); } catch {}
    }
});

// ===== REVENUE =====
bot.onText(/\/revenue/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;

    let conversions = JSON.parse(fs.readFileSync("conversions.json"));
    let total = conversions.reduce((sum, c) => sum + c.amount, 0);

    bot.sendMessage(msg.chat.id, `💰 Revenue: ₹${total}`);
});