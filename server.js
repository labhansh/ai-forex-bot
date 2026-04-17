const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const VIP_CHAT_ID = process.env.VIP_CHAT_ID;
const FREE_CHAT_ID = process.env.FREE_CHAT_ID;

// ===== FILE PATH =====
const DB_FILE = "signals.json";

// ===== INIT FILE IF NOT EXISTS =====
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]");
}

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

// ===== SEND TO TELEGRAM =====
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

if (data.event === "ENTRY") {
    message = formatMessage(data);
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

        // ===== SAVE SIGNAL =====
        const signal = {
            id: Date.now(),
            pair: data.pair,
            type: data.type,
            entry: parseFloat(data.entry),
            sl: parseFloat(data.sl),
            tp1: parseFloat(data.tp1),
            tp2: parseFloat(data.tp2),
            tp3: parseFloat(data.tp3),
            status: "OPEN",
			tp1Hit: false,
			tp2Hit: false,
			tp3Hit: false,
			slHit: false,
            createdAt: new Date()
        };

        let signals = JSON.parse(fs.readFileSync(DB_FILE));
        signals.push(signal);
        fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

        // ===== SEND TELEGRAM =====
        await sendMessage(VIP_CHAT_ID, message);

        setTimeout(() => {
            sendMessage(FREE_CHAT_ID, message);
        }, 15 * 60 * 1000);

        res.send("Signal stored & sent");

    } catch (error) {
        console.log(error);
        res.status(500).send("Error");
    }
});

            // BUY logic
          if (signal.type === "BUY") {

    if (!signal.slHit && price <= signal.sl) {
        signal.status = "SL HIT ❌";
        signal.slHit = true;

        await sendMessage(VIP_CHAT_ID, `❌ SL HIT\n${signal.pair}`);
    }

    if (!signal.tp1Hit && price >= signal.tp1) {
        signal.tp1Hit = true;

        await sendMessage(VIP_CHAT_ID, `🎯 TP1 HIT\n${signal.pair}`);
    }

    if (!signal.tp2Hit && price >= signal.tp2) {
        signal.tp2Hit = true;

        await sendMessage(VIP_CHAT_ID, `🎯 TP2 HIT\n${signal.pair}`);
    }

    if (!signal.tp3Hit && price >= signal.tp3) {
        signal.tp3Hit = true;
        signal.status = "TP3 HIT 🎯🎯🎯";

        await sendMessage(VIP_CHAT_ID, `🎯 TP3 HIT\n${signal.pair}`);
    }
}

            // SELL logic
           if (signal.type === "SELL") {

    if (!signal.slHit && price >= signal.sl) {
        signal.status = "SL HIT ❌";
        signal.slHit = true;

        await sendMessage(VIP_CHAT_ID, `❌ SL HIT\n${signal.pair}`);
    }

    if (!signal.tp1Hit && price <= signal.tp1) {
        signal.tp1Hit = true;

        await sendMessage(VIP_CHAT_ID, `🎯 TP1 HIT\n${signal.pair}`);
    }

    if (!signal.tp2Hit && price <= signal.tp2) {
        signal.tp2Hit = true;

        await sendMessage(VIP_CHAT_ID, `🎯 TP2 HIT\n${signal.pair}`);
    }

    if (!signal.tp3Hit && price <= signal.tp3) {
        signal.tp3Hit = true;
        signal.status = "TP3 HIT 🎯🎯🎯";

        await sendMessage(VIP_CHAT_ID, `🎯 TP3 HIT\n${signal.pair}`);
    }
}

        } catch (e) {
            console.log("Price fetch error for:", signal.pair);
        }
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2));

}, 10000); // every 10 sec

// ===== HISTORY API =====
app.get("/signals", (req, res) => {
    const signals = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(signals);
});

// ===== START SERVER =====
app.listen(3000, () => {
    console.log("Server running on port 3000");
});