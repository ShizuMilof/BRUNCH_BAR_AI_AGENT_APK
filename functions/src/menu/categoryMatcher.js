/* eslint-disable */

const {
  normalizeText,
} = require("../utils/normalize");

const CATEGORY_ALIASES = {
  pizza: ["pizza", "pizze", "pizzu"],
  sendvic: ["sendvic", "sendvič", "sendviči", "sendvici", "sendviča", "sendvica"],
  desert: ["desert", "deserti", "deserta"],
  predjelo: ["predjelo", "predjela", "tost", "salata", "vege"],
  glavno: ["glavno", "glavna", "glavnih", "glavno jelo", "glavna jela", "pizza", "tijesto", "vege"],
  meso: ["meso", "mesno"],
  sokovi: ["sok", "sokovi", "sokove", "sokova"],
  juha: ["juha", "juhu"],
  pasta: ["tijesto", "pasta", "pašta", "tjestenina"],
  pice: ["piće", "pića", "pice", "pica", "za piti", "napici", "napitak"],
  tost: ["tost", "tostovi", "tostova", "toast"],
};

function normalizeCategory(category) {
  const text = normalizeText(category || "");

  if (!text) return "";

  if (
    text.includes("sok") ||
    text.includes("sokovi") ||
    text.includes("sokove") ||
    text.includes("sokova")
  ) {
    return "sokovi";
  }

  if (
    text.includes("meso") ||
    text.includes("mesno")
  ) {
    return "meso";
  }

  if (
    text.includes("glavno jelo") ||
    text.includes("glavna jela") ||
    text.includes("glavno") ||
    text.includes("glavnih") ||
    text.includes("glavna")
  ) {
    return "glavno";
  }

  const entries = Object.entries(CATEGORY_ALIASES);

  for (const [canonical, aliases] of entries) {
    if (aliases.some((alias) => normalizeText(alias) === text)) {
      return canonical;
    }
  }

  return text;
}

function getCategorySearchTerms(category) {
  const canonical = normalizeCategory(category);

  if (!canonical) return [];

  return CATEGORY_ALIASES[canonical] || [canonical];
}

function findItemsByCategory(category, foods, drinks) {
  const normalizedCategory = normalizeCategory(category);

  if (normalizedCategory === "sokovi") {
    return (drinks || []).filter((item) =>
      normalizeText((item && item.category) || "") === "sokovi",
    );
  }

  if (normalizedCategory === "pice") {
    return drinks || [];
  }

  if (normalizedCategory === "meso") {
    return (foods || []).filter((item) => {
      const itemCategory = normalizeText((item && item.category) || "");
      const tags = item && item.tags ? item.tags : {};

      return itemCategory === "glavno" || tags.meso === true;
    });
  }

  if (normalizedCategory === "tost") {
    return (foods || []).filter((item) =>
      normalizeText((item && item.category) || "") === "tost",
    );
  }

  const terms = getCategorySearchTerms(category);

  if (!terms.length) return [];

  const normalizedTerms = terms.map(normalizeText);
  const allItems = [].concat(foods || [], drinks || []);

  const categoryMatches = allItems.filter((item) => {
    const itemCategory = normalizeText((item && item.category) || "");

    return normalizedTerms.includes(itemCategory);
  });

  if (categoryMatches.length > 0) {
    return categoryMatches;
  }

  return allItems.filter((item) => {
    const name = normalizeText((item && item.name) || "");
    const aliases = Array.isArray(item && item.aliasi) ? item.aliasi : [];

    return normalizedTerms.some((term) =>
      name.includes(term) ||
      aliases.some((alias) => normalizeText(alias) === term),
    );
  });
}

function findBestPersonalItemByCategory(category, foods, drinks, userOrders) {
  const matches = findItemsByCategory(category, foods, drinks);

  if (!matches.length) return null;

  const names = new Set(matches.map((item) => item.name));
  const counts = new Map();

  userOrders.forEach((order) => {
    const stavke = Array.isArray(order && order.stavke) ? order.stavke : [];

    stavke.forEach((rawItem) => {
      const baseName = rawItem
          .split("\n")[0]
          .replace(/\(X\d+\)/i, "")
          .trim();

      if (names.has(baseName)) {
        counts.set(baseName, (counts.get(baseName) || 0) + 1);
      }
    });
  });

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0) {
    return matches.find((item) => item.name === sorted[0][0]) || matches[0];
  }

  return matches[0];
}

module.exports = {
  normalizeCategory,
  getCategorySearchTerms,
  findItemsByCategory,
  findBestPersonalItemByCategory,
};

