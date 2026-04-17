const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

// ===== GLOBAL ERROR HANDLER =====
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const VIP_CHAT_ID = process.env.VIP_CHAT_ID;
const FREE_CHAT_ID = process.env.FREE_CHAT_ID;
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

// ===== FILE =====
const DB_FILE = "signals.json";

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]");
}

// ===== FREE LIMIT =====
let freeSignalsCount = 0;
let currentDate = new Date().toDateString();

// ===== ADMIN ALERT =====
async function sendAdminAlert(message) {
    if (!ADMIN_ID) return;

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: ADMIN_ID,
            text: "🚨 SYSTEM ALERT\n\n" + message
        });
    } catch (err) {
        console.log("Admin alert failed:", err.message);
    }
}

// ===== SAFE TELEGRAM SEND =====
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        });
    } catch (err) {
        console.log("Telegram Error:", err.message);
        await sendAdminAlert("Telegram Error: " + err.message);
    }
}

// ===== PREMIUM FORMAT =====
function formatMessage(data) {
    return `
🚀 <b>AI FOREX PRO VIP SIGNAL</b>

📊 <b>Pair:</b> ${data.pair}  
📈 <b>Type:</b> ${data.type}  

💰 <b>Entry:</b> ${data.entry}  
🛑 <b>Stop Loss:</b> ${data.sl}  

🎯 <b>Targets:</b>  
TP1 → ${data.tp1}  
TP2 → ${data.tp2}  
TP3 → ${data.tp3}  

⚡ <b>Risk:</b> Medium  
⏱ <b>Timeframe:</b> ${data.timeframe || "1m"}  

🆔 <code>${data.id}</code>
`;
}

// ===== TP + TRAILING =====
function checkTPHits(signal, price) {
    let updates = [];

    if (signal.type === "BUY") {
        if (!signal.tp1Hit && price >= signal.tp1) {
            signal.tp1Hit = true;
            signal.trailSL = signal.entry;
            updates.push("🎯 <b>TP1 HIT</b>\n🔒 SL moved to Entry");
        }

        if (!signal.tp2Hit && price >= signal.tp2) {
            signal.tp2Hit = true;
            signal.trailSL = signal.tp1;
            updates.push("🎯 <b>TP2 HIT</b>\n🔒 SL moved to TP1");
        }

        if (!signal.tp3Hit && price >= signal.tp3) {
            signal.tp3Hit = true;
            signal.status = "CLOSED";

            updates.push(`
🏆 <b>TRADE CLOSED IN PROFIT</b>

📊 ${signal.pair}
📈 ${signal.type}

💰 Entry: ${signal.entry}
🎯 TP3 HIT

🔥 <b>Another Winning Trade</b>
`);
        }

        if (price <= (signal.trailSL || signal.sl) && signal.status !== "CLOSED") {
            signal.status = "CLOSED";

            updates.push(`
❌ <b>TRADE CLOSED</b>

📊 ${signal.pair}
📉 ${signal.type}

🛑 Stop Loss Hit

⚠️ Risk Managed Trade
`);
        }
    }

    if (signal.type === "SELL") {
        if (!signal.tp1Hit && price <= signal.tp1) {
            signal.tp1Hit = true;
            signal.trailSL = signal.entry;
            updates.push("🎯 <b>TP1 HIT</b>\n🔒 SL moved to Entry");
        }

        if (!signal.tp2Hit && price <= signal.tp2) {
            signal.tp2Hit = true;
            signal.trailSL = signal.tp1;
            updates.push("🎯 <b>TP2 HIT</b>\n🔒 SL moved to TP1");
        }

        if (!signal.tp3Hit && price <= signal.tp3) {
            signal.tp3Hit = true;
            signal.status = "CLOSED";

            updates.push(`
🏆 <b>TRADE CLOSED IN PROFIT</b>

📊 ${signal.pair}
📈 ${signal.type}

💰 Entry: ${signal.entry}
🎯 TP3 HIT

🔥 <b>Another Winning Trade</b>
`);
        }

        if (price >= (signal.trailSL || signal.sl) && signal.status !== "CLOSED") {
            signal.status = "CLOSED";

            updates.push(`
❌ <b>TRADE CLOSED</b>

📊 ${signal.pair}
📉 ${signal.type}

🛑 Stop Loss Hit

⚠️ Risk Managed Trade
`);
        }
    }

    return updates;
}

// ===== PRICE =====
async function getLivePrice(symbol) {
    try {
        const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        return parseFloat(res.data.price);
    } catch {
        return null;
    }
}

function convertPair(pair) {
    return pair.replace("USD", "USDT");
}

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
    try {
        const data = req.body;
        let signals = JSON.parse(fs.readFileSync(DB_FILE));

        if (data.event === "ENTRY") {

            const signal = {
                id: data.id,
                pair: data.pair,
                type: data.type,
                entry: parseFloat(data.entry),
                sl: parseFloat(data.sl),
                tp1: parseFloat(data.tp1),
                tp2: parseFloat(data.tp2),
                tp3: parseFloat(data.tp3),

                tp1Hit: false,
                tp2Hit: false,
                tp3Hit: false,

                trailSL: null,
                partial1Done: false,
                partial2Done: false,

                status: "OPEN",
                createdAt: new Date()
            };

            signals.push(signal);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

            await sendMessage(VIP_CHAT_ID, formatMessage(signal));

            return res.send("ENTRY OK");
        }

        res.send("NO ACTION");

    } catch (err) {
        console.log(err);
        await sendAdminAlert(err.message);
        res.status(500).send("Error");
    }
});

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        time: new Date(),
        uptime: process.uptime()
    });
});

// ===== REAL-TIME ENGINE =====
setInterval(async () => {
    let signals = JSON.parse(fs.readFileSync(DB_FILE));

    for (let signal of signals) {
        if (signal.status !== "OPEN") continue;

        const price = await getLivePrice(convertPair(signal.pair));
        if (!price) continue;

        const hits = checkTPHits(signal, price);

        for (let hit of hits) {
            await sendMessage(VIP_CHAT_ID, hit + `

📊 ${signal.pair}
💰 Price: ${price}
🆔 <code>${signal.id}</code>
`);
        }
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

}, 5000);

// ===== AUTO CLEAN =====
setInterval(() => {
    let signals = JSON.parse(fs.readFileSync(DB_FILE));

    const now = Date.now();

    signals = signals.filter(s => {
        return now - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000;
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

}, 60 * 60 * 1000);

// ===== START =====
app.listen(3000, async () => {
    console.log("🚀 Server running on port 3000");
    await sendAdminAlert("✅ Server Started Successfully");
});