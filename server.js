const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const VIP_CHAT_ID = process.env.VIP_CHAT_ID;
const FREE_CHAT_ID = process.env.FREE_CHAT_ID;

// ===== FILE =====
const DB_FILE = "signals.json";

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]");
}

// ===== FREE LIMIT =====
let freeSignalsCount = 0;
let currentDate = new Date().toDateString();

// ===== SEND TELEGRAM =====
async function sendMessage(chatId, text) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
    });
}

// ===== PREMIUM FORMAT MESSAGE =====
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

// ===== TRAILING SL + PARTIAL BOOKING =====
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

// ===== PRICE API =====
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

                status: "OPEN"
            };

            signals.push(signal);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

            const message = formatMessage(signal);
            await sendMessage(VIP_CHAT_ID, message);

            return res.send("ENTRY OK");
        }

        res.send("NO ACTION");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

// ===== REAL-TIME ENGINE =====
setInterval(async () => {
    let signals = JSON.parse(fs.readFileSync(DB_FILE));

    for (let signal of signals) {

        if (signal.status !== "OPEN") continue;

        const symbol = convertPair(signal.pair);
        const price = await getLivePrice(symbol);

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

// ===== START =====
app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});