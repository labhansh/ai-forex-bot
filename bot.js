const VIP_CHAT_ID = -1003710328560;
const ADMIN_ID = 1867730623; // 🔴 replace with your Telegram ID

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

    if (text.toLowerCase() === "paid") {
        bot.sendMessage(chatId, `
✅ Payment done!

Send your Payment ID (Example: RZP123456)
`);
        return;
    }

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

            if (amount === 4000) { plan = "MONTHLY"; days = 30; }
            else if (amount === 6000) { plan = "BIMONTHLY"; days = 60; }
            else if (amount === 8000) { plan = "QUARTERLY"; days = 90; }
            else if (amount === 12000) { plan = "HALF YEARLY"; days = 180; }
            else if (amount === 20000) { plan = "YEARLY"; days = 365; }
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

            // mark payment used
            usedPayments.push(paymentId);
            fs.writeFileSync("usedPayments.json", JSON.stringify(usedPayments, null, 2));

            // ===== VIP MESSAGE WITH RENEW BUTTON =====
            bot.sendMessage(chatId, `
🎉 VIP Access Activated!

📦 Plan: ${plan}
📅 Expiry: ${expiry.toDateString()}

👉 Join VIP:
https://t.me/+iIMQZ78tOEkxYTY1
`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔁 Renew Plan", url: "https://rzp.io/rzp/Y25xVBG0" }]
                    ]
                }
            });

            // ===== AUTO ONBOARDING =====
            setTimeout(() => {
                bot.sendMessage(chatId, `
📊 <b>How to Use Signals:</b>

1️⃣ Follow Entry Price  
2️⃣ Book profit at TP levels  
3️⃣ Always use SL  

⚡ Use proper risk management

🔥 Let’s make profits!
`, { parse_mode: "HTML" });
            }, 5000);

        } catch (err) {
            console.log(err);
            bot.sendMessage(chatId, "❌ Invalid Payment ID or not found.");
        }
    }
});

// ===== AUTO REMOVE EXPIRED USERS =====
setInterval(async () => {
    try {
        let users = JSON.parse(fs.readFileSync("users.json"));

        const now = new Date();
        let updatedUsers = [];

        for (let user of users) {
            if (new Date(user.expiry) < now) {
                try {
                    await bot.banChatMember(VIP_CHAT_ID, user.chatId);
                    await bot.unbanChatMember(VIP_CHAT_ID, user.chatId);
                } catch (err) {}
            } else {
                updatedUsers.push(user);
            }
        }

        fs.writeFileSync("users.json", JSON.stringify(updatedUsers, null, 2));

    } catch (err) {
        console.log("Expiry check error:", err.message);
    }
}, 60 * 60 * 1000);

// ===== EXPIRY REMINDER =====
setInterval(async () => {
    try {
        let users = JSON.parse(fs.readFileSync("users.json"));
        const now = new Date();

        for (let user of users) {
            const expiry = new Date(user.expiry);
            const diff = expiry - now;

            if (diff > 0 && diff < (24 * 60 * 60 * 1000)) {
                await bot.sendMessage(user.chatId, `
⏰ <b>Your VIP Plan is Expiring Soon!</b>

📅 Expiry: ${expiry.toDateString()}

🔥 Renew now:
https://rzp.io/rzp/Y25xVBG0
`, { parse_mode: "HTML" });
            }
        }

    } catch (err) {
        console.log("Reminder error:", err.message);
    }
}, 6 * 60 * 60 * 1000);

// ===== ADMIN DASHBOARD =====
bot.onText(/\/stats/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;

    let users = JSON.parse(fs.readFileSync("users.json"));

    const now = new Date();

    let active = 0;
    let expired = 0;

    let monthly = 0;
    let bimonthly = 0;
    let quarterly = 0;
    let halfyearly = 0;
    let yearly = 0;

    let revenue = 0;

    users.forEach(u => {
        if (new Date(u.expiry) > now) {
            active++;
        } else {
            expired++;
        }

        switch (u.plan) {
            case "MONTHLY":
                monthly++;
                revenue += 4000;
                break;
            case "BIMONTHLY":
                bimonthly++;
                revenue += 6000;
                break;
            case "QUARTERLY":
                quarterly++;
                revenue += 8000;
                break;
            case "HALF YEARLY":
                halfyearly++;
                revenue += 12000;
                break;
            case "YEARLY":
                yearly++;
                revenue += 20000;
                break;
        }
    });

    bot.sendMessage(msg.chat.id, `
📊 <b>AI Forex Pro Dashboard</b>

👥 Total Users: ${users.length}  
💰 Active Users: ${active}  
❌ Expired Users: ${expired}  

📦 Monthly: ${monthly}  
📦 BiMonthly: ${bimonthly}  
📦 Quarterly: ${quarterly}  
📦 Half Yearly: ${halfyearly}  
📦 Yearly: ${yearly}  

💵 Estimated Revenue: ₹${revenue}
`, { parse_mode: "HTML" });
});