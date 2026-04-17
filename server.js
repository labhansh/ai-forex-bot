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

// ===== FORMAT MESSAGE =====
function formatMessage(data) {
    return `
🚀 <b>AI FOREX PRO VIP SIGNAL</b>

📊 ${data.pair}
📈 ${data.type}

💰 Entry: ${data.entry}
🛑 SL: ${data.sl}

🎯 TP1: ${data.tp1}
🎯 TP2: ${data.tp2}
🎯 TP3: ${data.tp3}

🆔 ${data.id}
`;
}

// ===== TRAILING SL + PARTIAL BOOKING =====
function checkTPHits(signal, price) {
    let updates = [];

    if (signal.type === "BUY") {

        if (!signal.tp1Hit && price >= signal.tp1) {
            signal.tp1Hit = true;
            signal.trailSL = signal.entry;
            signal.partial1Done = true;

            updates.push("TP1 HIT");
            updates.push("🔒 SL moved to Entry");
        }

        if (!signal.tp2Hit && price >= signal.tp2) {
            signal.tp2Hit = true;
            signal.trailSL = signal.tp1;
            signal.partial2Done = true;

            updates.push("TP2 HIT");
            updates.push("🔒 SL moved to TP1");
        }

        if (!signal.tp3Hit && price >= signal.tp3) {
            signal.tp3Hit = true;
            signal.status = "CLOSED";

            updates.push("🏆 TP3 HIT (TRADE CLOSED)");
        }

        if (price <= (signal.trailSL || signal.sl) && signal.status !== "CLOSED") {
            signal.status = "CLOSED";
            updates.push("❌ TRAIL SL HIT");
        }
    }

    if (signal.type === "SELL") {

        if (!signal.tp1Hit && price <= signal.tp1) {
            signal.tp1Hit = true;
            signal.trailSL = signal.entry;
            signal.partial1Done = true;

            updates.push("TP1 HIT");
            updates.push("🔒 SL moved to Entry");
        }

        if (!signal.tp2Hit && price <= signal.tp2) {
            signal.tp2Hit = true;
            signal.trailSL = signal.tp1;
            signal.partial2Done = true;

            updates.push("TP2 HIT");
            updates.push("🔒 SL moved to TP1");
        }

        if (!signal.tp3Hit && price <= signal.tp3) {
            signal.tp3Hit = true;
            signal.status = "CLOSED";

            updates.push("🏆 TP3 HIT (TRADE CLOSED)");
        }

        if (price >= (signal.trailSL || signal.sl) && signal.status !== "CLOSED") {
            signal.status = "CLOSED";
            updates.push("❌ TRAIL SL HIT");
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

                // ✅ NEW FEATURES
                trailSL: null,
                partial1Done: false,
                partial2Done: false,

                status: "OPEN"
            };

            signals.push(signal);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

            const message = formatMessage(signal);
            await sendMessage(VIP_CHAT_ID, message);

            // FREE GROUP
            const today = new Date().toDateString();
            if (today !== currentDate) {
                currentDate = today;
                freeSignalsCount = 0;
            }

            if (freeSignalsCount < 2) {
                setTimeout(() => {
                    sendMessage(FREE_CHAT_ID, message);
                }, 15 * 60 * 1000);

                freeSignalsCount++;
            }

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
            await sendMessage(VIP_CHAT_ID, `
${hit}

📊 ${signal.pair}
💰 Price: ${price}
🆔 ${signal.id}
`);
        }
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

}, 5000);

// ===== START =====
app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});