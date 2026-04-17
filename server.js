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

📊 <b>Pair:</b> ${data.pair}
⏱ <b>Timeframe:</b> ${data.timeframe}m

📈 <b>Type:</b> ${data.type}

💰 <b>Entry:</b> ${data.entry}
🛑 <b>Stop Loss:</b> ${data.sl}

🎯 <b>TP1:</b> ${data.tp1}
🎯 <b>TP2:</b> ${data.tp2}
🎯 <b>TP3:</b> ${data.tp3}

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

        let message = "";

        // ===== MESSAGE HANDLER =====
        if (data.event === "ENTRY") {
            message = formatMessage(data);

            // ===== SAVE ONLY ENTRY SIGNAL =====
            const signal = {
                id: Date.now(),
                pair: data.pair,
                type: data.type,
                entry: data.entry,
                sl: data.sl,
                tp1: data.tp1,
                tp2: data.tp2,
                tp3: data.tp3,
                status: "OPEN",
                createdAt: new Date()
            };

            let signals = JSON.parse(fs.readFileSync(DB_FILE));
            signals.push(signal);
            fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));
        }

        else if (data.event === "TP1") {
            message = `🎯 TP1 HIT\n${data.pair}`;
        }
        else if (data.event === "TP2") {
            message = `🎯 TP2 HIT\n${data.pair}`;
        }
        else if (data.event === "TP3") {
            message = `🚀 TP3 HIT (FULL TARGET)\n${data.pair}`;
        }
        else if (data.event === "SL") {
            message = `❌ STOP LOSS HIT\n${data.pair}`;
        }

        // ===== SEND VIP =====
        await sendMessage(VIP_CHAT_ID, message);

        // ===== FREE LIMIT LOGIC =====
        const today = new Date().toDateString();
        if (today !== currentDate) {
            currentDate = today;
            freeSignalsCount = 0;
        }

        if (freeSignalsCount < 2 && data.event === "ENTRY") {
            setTimeout(() => {
                sendMessage(FREE_CHAT_ID, message);
            }, 15 * 60 * 1000);

            freeSignalsCount++;
        } else if (data.event === "ENTRY") {
            console.log("Free limit reached");

            await sendMessage(FREE_CHAT_ID,
                "🚫 Free limit reached today.\nUpgrade to VIP for unlimited signals."
            );
        }

        res.send("OK");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

// ===== HISTORY API =====
app.get("/signals", (req, res) => {
    const signals = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(signals);
});

// ===== START =====
app.listen(3000, () => {
    console.log("Server running on port 3000");
});