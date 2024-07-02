require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

let latestMessage = "";
let previousMessage = "";
let messageTimestamp = Date.now();

// Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Hello! Send me a message and I will display it on the website."
  );
});

bot.on("message", (msg) => {
  if (msg.text !== "/start") {
    previousMessage = latestMessage;
    latestMessage = msg.text;
    messageTimestamp = Date.now();
    bot.sendMessage(msg.chat.id, `Message received: ${msg.text}`);
    broadcast({ latestMessage, previousMessage, messageTimestamp });
  }
});

app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.send(JSON.stringify({ latestMessage, previousMessage, messageTimestamp }));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
