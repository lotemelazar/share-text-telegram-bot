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

const users = {};

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Welcome! Please log in using /login <password>"
  );
});

bot.onText(/\/login (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1];

  if (password === process.env.BOT_PASSWORD) {
    users[chatId] = true;
    bot.sendMessage(
      chatId,
      "Login successful! Send me a message and I will display it on the website."
    );
  } else {
    bot.sendMessage(chatId, "Invalid password. Please try again.");
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Ignore messages that start with /start or /login commands
  if (msg.text.startsWith("/start") || msg.text.startsWith("/login")) {
    return;
  }

  // Check if the user is logged in
  if (!users[chatId]) {
    bot.sendMessage(chatId, "Please log in first using /login <password>");
    return;
  }

  // Handle other messages if the user is logged in
  previousMessage = latestMessage;
  latestMessage = msg.text;
  messageTimestamp = Date.now();
  bot.sendMessage(chatId, `Message received: ${msg.text}`);
  broadcast({ latestMessage, previousMessage, messageTimestamp });
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
