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

// ===== FREE LIMIT TRACKING =====
let freeSignalsCount = 0;
let currentDate = new Date().toDateString();

// ===== FORMAT MESSAGE =====
function formatMessage(data) {
    return `
🚀 <b>AI FOREX PRO VIP SIGNAL</b>

━━━━━━━━━━━━━━━

📊 <b>Pair:</b> ${data.pair || "-"}
⏱ <b>Timeframe:</b> ${data.timeframe || "-"}

📈 <b>Type:</b> ${data.type || "-"}

💰 <b>Entry:</b> ${data.entry || "-"}
🛑 <b>Stop Loss:</b> ${data.sl || "-"}

🎯 <b>TP1:</b> ${data.tp1 || "-"}
🎯 <b>TP2:</b> ${data.tp2 || "-"}
🎯 <b>TP3:</b> ${data.tp3 || "-"}

🆔 <b>ID:</b> ${data.id}

━━━━━━━━━━━━━━━
⚡ Powered by AI Forex Pro
`;
}

// ===== SEND =====
async function sendMessage(chatId, text) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
    });
}

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
    try {
        const data = req.body;

        let signals = JSON.parse(fs.readFileSync(DB_FILE));

        // =============================
        // ===== ENTRY SIGNAL =====
        // =============================
        if (data.event === "ENTRY") {

            // use TradingView ID (IMPORTANT)
            const signalId = data.id;

            const signal = {
                id: signalId,
                pair: data.pair,
                type: data.type,
                entry: data.entry,
                sl: data.sl,
                tp1: data.tp1,
                tp2: data.tp2,
                tp3: data.tp3,
                tp1Hit: false,
                tp2Hit: false,
                tp3Hit: false,
                status: "OPEN",
                createdAt: new Date()
            };

            signals.push(signal);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

            const message = formatMessage(signal);

            await sendMessage(VIP_CHAT_ID, message);

            // ===== FREE LIMIT =====
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

        // =============================
        // ===== FIND SIGNAL =====
        // =============================
        const signal = signals.find(s => s.id == data.id);

        if (!signal) {
            return res.send("Signal not found");
        }

        // =============================
        // ===== TP1 =====
        // =============================
        if (data.event === "TP1" && !signal.tp1Hit) {
            signal.tp1Hit = true;

            await sendMessage(VIP_CHAT_ID, `
🎯 <b>TP1 HIT</b>

📊 ${signal.pair}
🆔 ${signal.id}
`);
        }

        // =============================
        // ===== TP2 =====
        // =============================
        if (data.event === "TP2" && !signal.tp2Hit) {
            signal.tp2Hit = true;

            await sendMessage(VIP_CHAT_ID, `
🎯 <b>TP2 HIT</b>

📊 ${signal.pair}
🆔 ${signal.id}
`);
        }

        // =============================
        // ===== TP3 =====
        // =============================
        if (data.event === "TP3" && !signal.tp3Hit) {
            signal.tp3Hit = true;
            signal.status = "CLOSED";

            await sendMessage(VIP_CHAT_ID, `
🏆 <b>TP3 HIT - TRADE CLOSED</b>

📊 ${signal.pair}
🆔 ${signal.id}
`);
        }

        // =============================
        // ===== SL =====
        // =============================
        if (data.event === "SL" && signal.status !== "CLOSED") {
            signal.status = "CLOSED";

            await sendMessage(VIP_CHAT_ID, `
❌ <b>STOP LOSS HIT</b>

📊 ${signal.pair}
🆔 ${signal.id}
`);
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

        res.send("UPDATED");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

// ===== HISTORY =====
app.get("/signals", (req, res) => {
    const signals = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(signals);
});

// ===== START =====
app.listen(3000, () => {
    console.log("Server running on port 3000");
});