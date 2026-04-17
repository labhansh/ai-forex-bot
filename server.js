const express = require("express");
const axios = require("axios");
const fs = require("fs");
const Razorpay = require("razorpay");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const VIP_CHAT_ID = process.env.VIP_CHAT_ID;
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
});

// ===== FILES =====
const DB_FILE = "signals.json";
const USERS_FILE = "users.json";
const PAY_FILE = "usedPayments.json";
const CONV_FILE = "conversions.json";

[DB_FILE, USERS_FILE, PAY_FILE, CONV_FILE].forEach(f => {
    if (!fs.existsSync(f)) fs.writeFileSync(f, "[]");
});

// ===== ERROR HANDLING =====
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// ===== TELEGRAM SEND =====
async function sendMessage(chatId, text, extra = {}) {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            ...extra
        });
    } catch (err) {
        console.log("Telegram error:", err.message);
    }
}

// ===== SIGNAL FORMAT =====
function formatMessage(data) {
    return `
🚀 <b>AI FOREX PRO VIP SIGNAL</b>

📊 <b>${data.pair}</b>
📈 ${data.type}

💰 Entry: ${data.entry}
🛑 SL: ${data.sl}

🎯 TP1: ${data.tp1}
🎯 TP2: ${data.tp2}
🎯 TP3: ${data.tp3}

🆔 <code>${data.id}</code>
`;
}

// ===== TRADINGVIEW WEBHOOK =====
app.post("/webhook", async (req, res) => {
    try {
        const d = req.body;
        let signals = JSON.parse(fs.readFileSync(DB_FILE));

        if (d.event === "ENTRY") {
            const s = {
                id: d.id,
                pair: d.pair,
                type: d.type,
                entry: parseFloat(d.entry),
                sl: parseFloat(d.sl),
                tp1: parseFloat(d.tp1),
                tp2: parseFloat(d.tp2),
                tp3: parseFloat(d.tp3),
                status: "OPEN"
            };

            signals.push(s);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

            await sendMessage(VIP_CHAT_ID, formatMessage(s));
        }

        res.send("OK");

    } catch (e) {
        console.log(e);
        res.status(500).send("Error");
    }
});

// ===== TELEGRAM BOT (WEBHOOK MODE) =====
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text;

    // ===== START =====
    if (text === "/start") {
        await sendMessage(chatId, `
👋 Welcome to AI Forex Pro

💰 <b>Buy VIP Plans:</b>

📦 Monthly ₹4000  
https://rzp.io/rzp/Y25xVBG0

📦 BiMonthly ₹6000  
https://rzp.io/rzp/OAXQNsA

📦 Quarterly ₹8000  
https://rzp.io/rzp/4eNZIVS

📦 Half Yearly ₹12000  
https://rzp.io/rzp/8021mrL9

📦 Yearly ₹20000  
https://rzp.io/rzp/WVP9IjK

👉 <b>After payment:</b>  
Send <b>PAID</b>
`);
    }

    // ===== PAID =====
    if (text.toLowerCase() === "paid") {
        await sendMessage(chatId, "📩 Send your Payment ID (Example: RZP123456)");
    }

    // ===== VERIFY PAYMENT =====
    if (text.startsWith("RZP")) {
        const paymentId = text.trim();

        try {
            let usedPayments = JSON.parse(fs.readFileSync(PAY_FILE));
            if (usedPayments.includes(paymentId)) {
                return sendMessage(chatId, "❌ Payment already used");
            }

            const payment = await razorpay.payments.fetch(paymentId);

            if (payment.status !== "captured") {
                return sendMessage(chatId, "❌ Payment not completed");
            }

            const amount = payment.amount / 100;

            let plan = "", days = 0;

            if (amount === 4000) { plan = "MONTHLY"; days = 30; }
            else if (amount === 6000) { plan = "BIMONTHLY"; days = 60; }
            else if (amount === 8000) { plan = "QUARTERLY"; days = 90; }
            else if (amount === 12000) { plan = "HALF YEARLY"; days = 180; }
            else if (amount === 20000) { plan = "YEARLY"; days = 365; }
            else return sendMessage(chatId, "❌ Invalid plan amount");

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + days);

            let users = JSON.parse(fs.readFileSync(USERS_FILE));
            users.push({ chatId, plan, expiry });

            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

            usedPayments.push(paymentId);
            fs.writeFileSync(PAY_FILE, JSON.stringify(usedPayments, null, 2));

            let conversions = JSON.parse(fs.readFileSync(CONV_FILE));
            conversions.push({ chatId, plan, amount, date: new Date() });
            fs.writeFileSync(CONV_FILE, JSON.stringify(conversions, null, 2));

            await sendMessage(chatId, `
🎉 <b>VIP Activated</b>

📦 Plan: ${plan}
📅 Expiry: ${expiry.toDateString()}

👉 Join VIP:
https://t.me/+iIMQZ78tOEkxYTY1
`);

        } catch (err) {
            console.log(err);
            await sendMessage(chatId, "❌ Invalid Payment ID");
        }
    }

    // ===== ADMIN STATS =====
    if (text === "/stats" && chatId == ADMIN_ID) {
        let users = JSON.parse(fs.readFileSync(USERS_FILE));
        await sendMessage(chatId, `📊 Total Users: ${users.length}`);
    }

    // ===== BROADCAST =====
    if (text.startsWith("/broadcast") && chatId == ADMIN_ID) {
        const message = text.replace("/broadcast ", "");
        let users = JSON.parse(fs.readFileSync(USERS_FILE));

        for (let u of users) {
            try {
                await sendMessage(u.chatId, message);
                await new Promise(r => setTimeout(r, 50));
            } catch {}
        }
    }

    res.sendStatus(200);
});

// ===== SET TELEGRAM WEBHOOK =====
app.get("/setWebhook", async (req, res) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${req.protocol}://${req.get("host")}/bot${BOT_TOKEN}`;
    await axios.get(url);
    res.send("Webhook set");
});

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        time: new Date()
    });
});

// ===== START =====
app.listen(3000, () => console.log("🚀 Server Running"));