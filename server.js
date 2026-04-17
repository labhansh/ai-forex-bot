const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = "8364091364:AAFkaIhar-d1-kmyc7ao2d49HBITmjGCoOc";
const VIP_CHAT_ID = "-1003710328560";
const FREE_CHAT_ID = "-1003910438629";

// ===== FORMAT MESSAGE =====
function formatMessage(data) {
    return `
🚀 <b>AI FOREX PRO SIGNAL</b>

📊 Pair: ${data.pair}
⏱ Timeframe: ${data.timeframe}

📈 Type: <b>${data.type}</b>

💰 Entry: ${data.entry}
🛑 SL: ${data.sl}

🎯 TP1: ${data.tp1}
🎯 TP2: ${data.tp2}
🎯 TP3: ${data.tp3}
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