const {
  normalizeText,
} = require("../utils/normalize");

const {
  extractBaseItemName,
} = require("../orders/orderHelpers");

function encodeRepeatItem(item) {
  return Buffer.from(item, "utf8").toString("base64");
}

function decodeRepeatItem(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

function extractRequestedQuantity(message) {
  const text = normalizeText(message);

  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) return Number(digitMatch[1]);

  const words = {
    jedan: 1,
    jednu: 1,
    jedno: 1,
    dva: 2,
    dvije: 2,
    tri: 3,
    cetiri: 4,
    četiri: 4,
    pet: 5,
    šest: 6,
    sest: 6,
    sedam: 7,
  };

  for (const [word, value] of Object.entries(words)) {
    if (text.includes(word)) return value;
  }

  return null;
}

function replaceItemQuantity(item, quantity) {
  if (!quantity) return item;

  if (item.match(/\(X\d+\)/i)) {
    return item.replace(/\(X\d+\)/i, `(X${quantity})`);
  }

  return `${item} (X${quantity})`;
}

function isRepeatDisplayedOrderIntent(message) {
  const text = normalizeText(message);

  return (
    text.includes("naruci je ponovno") ||
    text.includes("naruci je ponovo") ||
    text.includes("naruc je ponovo") ||
    text.includes("naruc je ponovno") ||
    text.includes("moze ponovno") ||
    text.includes("ponovno") ||
    text.includes("ponovo") ||
    text.includes("može ponovo") ||
    text.includes("naruci ponovno") ||
    text.includes("ponovi narudzbu") ||
    text.includes("ponovno naruci") ||
    text.includes("opet naruci") ||
    text.includes("naruči je ponovno") ||
    text.includes("naruči ponovno") ||
    text.includes("ponovi narudžbu") ||
    text.includes("ponovno naruči") ||
    text.includes("opet naruči")
  );
}

function getLastDisplayedOrderItemsFromHistory(history) {
  const assistantMessages = history
      .filter((item) =>
        item.role === "assistant" || item.sender === "assistant",
      )
      .reverse();

  for (const msg of assistantMessages) {
    const text =
        msg.content ||
        msg.message ||
        msg.text ||
        "";

    if (!text.includes("ova narudžba sadrži") && !text.includes("ova narudzba sadrzi")) {
      continue;
    }

    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const items = lines
        .filter((line) => line.startsWith("- "))
        .map((line) => line.replace(/^- /, "").trim());

    if (items.length > 0) {
      return items.map((item) => {
        const quantityMatch = item.match(/\sx(\d+)$/i);
        if (quantityMatch) {
          const quantity = Number(quantityMatch[1]);
          const baseName = item.replace(/\sx\d+$/i, "").trim();
          return `${baseName}(X${quantity})`;
        }

        return `${item}(X1)`;
      });
    }
  }

  return [];
}


function getLastSelectedRepeatItem(history) {
  const assistantMessages = history
      .filter((item) =>
        item.role === "assistant" || item.sender === "assistant",
      )
      .reverse();

  for (const msg of assistantMessages) {
    if (msg.metadata && msg.metadata.selectedRepeatItem) {
      return msg.metadata.selectedRepeatItem;
    }
  }

  return "";
}

function isQuantityCorrectionIntent(message) {
  const text = normalizeText(message);

  return (
    text.includes("ali") ||
    text.includes("ipak") ||
    text.includes("daj mi") ||
    text.includes("komada") ||
    /\b\d+\b/.test(text)
  );
}


module.exports = {
  encodeRepeatItem,
  decodeRepeatItem,
  extractRequestedQuantity,
  replaceItemQuantity,
  isRepeatDisplayedOrderIntent,
  getLastDisplayedOrderItemsFromHistory,
  getLastSelectedRepeatItem,
  isQuantityCorrectionIntent,
};
