const {
  normalizeText,
} = require("../utils/normalize");

function findMenuItemByName(name, foods, drinks) {
  const normalizedName = normalizeText(name);
  const menu = [].concat(foods || [], drinks || []);

  return menu.find((item) =>
    normalizeText(item.name || "") === normalizedName,
  );
}
function findMenuItemFromMessage(message, foods, drinks) {
  const text = normalizeText(message || "");

  const menuBrowsingPhrases = [
    "sta imas od",
    "što imas od",
    "što imaš od",
    "sta imaš od",
    "koje imas",
    "koje imaš",
    "koja imas",
    "koja imaš",
    "pokazi",
    "pokaži",
  ];

  if (menuBrowsingPhrases.some((phrase) => text.includes(normalizeText(phrase)))) {
    return null;
  }
  const menu = [].concat(foods || [], drinks || []);

  const ignoredWords = new Set([
    "daj", "mi", "molim", "moze", "može", "zelim", "želim",
    "dodaj", "uzmi", "hocu", "hoću", "bih", "bi",
    "jedan", "jednu", "jedno", "dva", "dvije",
  ]);

  function normalizeWord(word) {
    let w = normalizeText(word || "");

    if (w.endsWith("u") && w.length > 4) {
      w = w.slice(0, -1) + "a";
    }

    return w;
  }

  function getWords(value) {
    return normalizeText(value || "")
        .split(/\s+/)
        .map(normalizeWord)
        .filter((word) => word.length > 2 && !ignoredWords.has(word));
  }

  function containsWholePhrase(textValue, phraseValue) {
    const textWords = getWords(textValue);
    const phraseWords = getWords(phraseValue);

    if (!phraseWords.length) return false;

    for (let i = 0; i <= textWords.length - phraseWords.length; i++) {
      const slice = textWords.slice(i, i + phraseWords.length);

      if (slice.join(" ") === phraseWords.join(" ")) {
        return true;
      }
    }

    return false;
  }

  const messageWords = getWords(text);

  if (!messageWords.length) return null;

  const matches = menu
      .map((item) => {
        if (!item) return null;

        const itemName = item.name || "";
        const aliases = Array.isArray(item.aliasi) ? item.aliasi : [];

        let bestScore = 0;

        const normalizedItemName = normalizeText(itemName);

        if (containsWholePhrase(text, normalizedItemName)) {
          bestScore = Math.max(bestScore, 1000);
        }

        aliases.forEach((alias) => {
          if (containsWholePhrase(text, alias)) {
            bestScore = Math.max(bestScore, 500);
          }
        });

        const itemNameWords = getWords(itemName);
        const nameWordScore = itemNameWords.filter((word) =>
          messageWords.includes(word),
        ).length * 20;

        bestScore = Math.max(bestScore, nameWordScore);

        aliases.forEach((alias) => {
          const aliasWords = getWords(alias);

          const aliasScore = aliasWords.filter((word) =>
            messageWords.includes(word),
          ).length * 5;

          bestScore = Math.max(bestScore, aliasScore);
        });

        return {
          item,
          score: bestScore,
        };
      })
      .filter((entry) => entry && entry.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        normalizeText(b.item.name || "").length - normalizeText(a.item.name || "").length,
      );

  return matches.length ? matches[0].item : null;
}


function getRecommendationCategoryFromMessage(message, plannedCategory = "") {
  const text = normalizeText(`${plannedCategory} ${message}`);

  const rules = [
    {key: "predjelo", labels: ["predjelo", "predjela", "starter", "tost"]},
    {
      key: "glavno",
      labels: [
        "glavno jelo",
        "glavna jela",
        "glavnih jela",
      ],
    }, {key: "pizza", labels: ["pizza", "pizze", "pizzu"]},
    {key: "pasta", labels: ["pasta", "paste", "tjestenina", "tijesto"]},
    {key: "sendvic", labels: ["sendvic", "sendvici", "sendvič", "sendviči"]},
    {key: "salata", labels: ["salata", "salate", "salatu"]},
    {key: "desert", labels: ["desert", "deserti", "kolac", "kolaci", "kolač", "kolači", "slatko"]},
    {key: "pice", labels: ["pice", "pica", "piće", "pića", "sok", "sokovi", "kava", "caj", "čaj"]},
  ];

  const match = rules.find((rule) =>
    rule.labels.some((label) => text.includes(normalizeText(label))),
  );

  return match ? match.key : "";
}

function getRecommendedItemsByCategory(categoryKey, foods, drinks, limit = 3) {
  const menu = categoryKey === "pice" ? drinks : foods;
  const wanted = normalizeText(categoryKey || "");

  return menu
      .filter((item) => {
        const category = normalizeText(item.category || "");
        const name = normalizeText(item.name || "");

        if (wanted === "glavno") {
          return (
            category.includes("glavno") ||
            category.includes("pizza") ||
            category.includes("pasta") ||
            category.includes("tijesto") ||
            category.includes("sendvic") ||
            category.includes("sendvič")
          );
        }

        if (wanted === "pice") {
          return (
            category.includes("pice") ||
            category.includes("piće") ||
            category.includes("sok") ||
            category.includes("kava") ||
            category.includes("caj") ||
            category.includes("čaj")
          );
        }

        if (wanted === "salata") {
          return category.includes("salata") || name.includes("salata");
        }

        if (wanted === "tost") {
          return category.includes("tost") || name.includes("tost");
        }

        if (wanted === "vege") {
          return category.includes("vege") || name.includes("vege");
        }

        if (wanted === "sendvic") {
          return (
            category.includes("sendvic") ||
            category.includes("sendvič") ||
            name.includes("sendvic") ||
            name.includes("sendvič")
          );
        }

        return category.includes(wanted) || name.includes(wanted);
      })
      .slice(0, limit)
      .map((item) => item.name);
}

function getRecommendationCategoryLabel(categoryKey) {
  const labels = {
    predjelo: "predjela",
    glavno: "glavnih jela",
    pizza: "pizza",
    pasta: "tjestenina",
    sendvic: "sendviča",
    salata: "salata",
    desert: "deserta",
    pice: "pića",
  };

  return labels[categoryKey] || "te kategorije";
}


function menuItemMatchesRecommendationCategory(item, categoryKey) {
  const category = normalizeText(item.category || "");
  const name = normalizeText(item.name || "");

  if (categoryKey === "glavno") {
    return (
      category.includes("glavno") ||
      category.includes("pizza") ||
      category.includes("pasta") ||
      category.includes("tijesto") ||
      category.includes("sendvic") ||
      category.includes("sendvič")
    );
  }

  if (categoryKey === "sendvic") {
    return (
      category.includes("sendvic") ||
      category.includes("sendvič") ||
      name.includes("sendvic") ||
      name.includes("sendvič")
    );
  }

  if (categoryKey === "pasta") {
    return (
      category.includes("pasta") ||
      category.includes("tjestenina") ||
      category.includes("tijesto") ||
      name.includes("pasta") ||
      name.includes("tjestenina") ||
      name.includes("tijesto")
    );
  }

  if (categoryKey === "pice") {
    return (
      category.includes("pice") ||
      category.includes("piće") ||
      category.includes("sok") ||
      category.includes("kava") ||
      category.includes("caj") ||
      category.includes("čaj") ||
      name.includes("cola") ||
      name.includes("voda")
    );
  }

  return category.includes(categoryKey) || name.includes(categoryKey);
}

function filterNamesByCategory(names, categoryKey, foods, drinks) {
  const menu = [].concat(foods || [], drinks || []);

  return names.filter((name) => {
    const menuItem = menu.find((item) =>
      normalizeText(item.name || "") === normalizeText(name),
    );

    return menuItem && menuItemMatchesRecommendationCategory(menuItem, categoryKey);
  });
}

function getItemsByTag(tag, foods, limit = 5) {
  return (foods || [])
      .filter((item) => {
        const tags = item.tags || {};

        return (
          tags[tag] === true ||
          tags[tag] === tag
        );
      })
      .sort((a, b) =>
        (b.popularnost || 0) - (a.popularnost || 0),
      )
      .slice(0, limit);
}

module.exports = {
  findMenuItemByName,
  findMenuItemFromMessage,
  getRecommendationCategoryFromMessage,
  getRecommendationCategoryLabel,
  getRecommendedItemsByCategory,
  menuItemMatchesRecommendationCategory,
  filterNamesByCategory,
  getItemsByTag,
};

