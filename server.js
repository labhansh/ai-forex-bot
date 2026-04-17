const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const VIP_CHAT_ID = process.env.VIP_CHAT_ID;
const FREE_CHAT_ID = process.env.FREE_CHAT_ID;

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

        const message = formatMessage(data);

        // VIP instant
        await sendMessage(VIP_CHAT_ID, message);

        // FREE delayed
        setTimeout(() => {
            sendMessage(FREE_CHAT_ID, message);
        }, 15 * 60 * 1000);

        res.send("Signal sent");

    } catch (error) {
        console.log(error);
        res.status(500).send("Error");
    }
});

// ===== START SERVER =====
app.listen(3000, () => {
    console.log("Server running on port 3000");
});