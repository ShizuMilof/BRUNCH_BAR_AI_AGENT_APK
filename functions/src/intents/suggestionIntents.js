const {
  normalizeText,
} = require("../utils/normalize");

function isConfirmSuggestedItemIntent(message) {
  const text = normalizeText(message || "");

 const confirmations = [
   "da",
   "moze",
   "može",
   "moze daj",
   "može daj",
   "moze, daj",
   "moze,daj",
   "može,daj",
   "daj",
   "dodaj",
   "dodaj to",
   "uzmi to",
   "moze to",
   "može to",
   "ok",
   "oke",
   "okej",
   "super",
 ];

  const cleaned = text.replace(/[,.!?]/g, "").trim();

  return confirmations.includes(cleaned);
}

function getSuggestedItemIndexFromMessage(message) {
  const text = normalizeText(message || "");

  if (text.includes("prvi") || text.includes("prvo") || text.includes("1")) return 0;
  if (text.includes("drugi") || text.includes("drugo") || text.includes("2")) return 1;
  if (text.includes("treci") || text.includes("trece") || text.includes("3")) return 2;
  if (text.includes("cetvrti") || text.includes("četvrti") || text.includes("4")) return 3;
  if (text.includes("pet") || text.includes("peti") || text.includes("5")) return 4;

  return -1;
}

function resolveSuggestedItemFromMessage(message, suggestedItems) {
  const text = normalizeText(message || "");

  if (!Array.isArray(suggestedItems) || !suggestedItems.length) {
    return "";
  }

  const categoryWords = [
    "pizza", "pizzu", "pizze",
    "salata", "salatu", "salate",
    "pasta", "tjestenina", "tijesto",
    "desert", "kolac", "kolač",
    "pice", "piće", "kava", "sok",
  ];

  const suggestedText = suggestedItems
      .map((item) => normalizeText(item))
      .join(" ");

  const mentionsDifferentCategory = categoryWords.some((word) =>
    text.includes(normalizeText(word)) && !suggestedText.includes(normalizeText(word)),
  );

  if (mentionsDifferentCategory) return "";

  const ignoredWords = new Set([
    "daj", "mi", "molim", "moze", "može", "zelim", "želim",
    "dodaj", "uzmi", "hocu", "hoću", "bih", "bi",
    "ovaj", "ovog", "ovoga", "puta", "samo",
    "od", "sa", "s", "bez",

    "pizza", "pizzu", "pizze",
    "salata", "salatu", "salate",
    "sendvic", "sendvič", "sendvici", "sendviči",
    "pasta", "pastu", "tjestenina", "tijesto",
    "tost", "tosta",
    "desert", "kolac", "kolač",
    "kava", "kavu",
    "sok", "pice", "piće",
  ]);

  const normalizeWord = (word) => {
    let w = normalizeText(word || "");

    if (w.endsWith("u") && w.length > 4) {
      w = w.slice(0, -1) + "a";
    }

    if (w === "margarita" || w === "margerita" || w === "margharita") {
      return "margherita";
    }

    if (w === "sopska" || w === "šopska") {
      return "sopska";
    }

    if (w === "mjesana" || w === "miješana" || w === "mijesana") {
      return "mjesana";
    }

    if (w === "sunka" || w === "šunka") {
      return "sunka";
    }

    return w;
  };

  const messageWords = text
      .split(/\s+/)
      .map(normalizeWord)
      .filter((word) => word.length > 2 && !ignoredWords.has(word));

  const matches = suggestedItems
      .map((itemName) => {
        const normalizedName = normalizeText(itemName);

        if (text.includes(normalizedName)) {
          return {itemName, score: 100};
        }

        const itemWords = normalizedName
            .split(/\s+/)
            .map(normalizeWord)
            .filter((word) => word.length > 2 && !ignoredWords.has(word));

        let score = 0;

        itemWords.forEach((word) => {
          if (messageWords.includes(word)) {
            score += 10;
          }
        });

        const requiredScore = itemWords.length <= 2 ? 10 : 20;

        return {itemName, score, requiredScore};
      })
      .filter((match) => match.score >= match.requiredScore)
      .sort((a, b) => b.score - a.score);

  return matches.length ? matches[0].itemName : "";
}


module.exports = {
  isConfirmSuggestedItemIntent,
  getSuggestedItemIndexFromMessage,
  resolveSuggestedItemFromMessage,
};
