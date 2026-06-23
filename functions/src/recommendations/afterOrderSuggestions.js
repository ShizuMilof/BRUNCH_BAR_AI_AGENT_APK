const {
  normalizeText,
} = require("../utils/normalize");

const {
  findMenuItemByName,
  menuItemMatchesRecommendationCategory,
} = require("../menu/menuLookup");

const {
  getSmartRecommendationsByCategory,
} = require("../compose/composeRecommendations");

const {
  extractBaseItemName,
} = require("../orders/orderHelpers");

function getItemCategory(itemName, foods, drinks) {
  const menu = [].concat(foods || [], drinks || []);
  const baseName = extractBaseItemName(itemName);

  const item = findMenuItemByName(baseName, foods, drinks);

  if (!item) return "";

  return normalizeText(item.category || "");
}

function analyzeAddedItems(addedItems, foods, drinks) {
  const categories = addedItems.map((item) =>
    getItemCategory(item, foods, drinks),
  );

  console.log("AFTER ORDER ADDED ITEMS:", JSON.stringify(addedItems));
  console.log("AFTER ORDER CATEGORIES:", JSON.stringify(categories));

  const hasDrink = categories.some((c) =>
    c.includes("pice") ||
    c.includes("piće") ||
    c.includes("sok") ||
    c.includes("kava") ||
    c.includes("caj") ||
    c.includes("čaj"),
  );

  const hasCoffee = categories.some((c) =>
    c.includes("kava"),
  );

  const hasDessert = categories.some((c) =>
    c.includes("desert") ||
    c.includes("kolac") ||
    c.includes("kolač"),
  );

  const hasSalad = categories.some((c) =>
    c.includes("salata"),
  );

  const hasMain = categories.some((c) =>
    c.includes("pizza") ||
    c.includes("pasta") ||
    c.includes("tijesto") ||
    c.includes("sendvic") ||
    c.includes("sendvič") ||
    c.includes("glavno") ||
    c.includes("meso"),
  );

  const hasSoup = categories.some((c) =>
    c.includes("juha"),
  );

  return {
    hasDrink,
    hasCoffee,
    hasDessert,
    hasSalad,
    hasMain,
    hasSoup,
    count: addedItems.length,
  };
}
function pickSuggestionFromCategories(categories, foods, drinks, userOrders, allOrders) {
  console.log("PICK SUGGESTION CATEGORIES:", JSON.stringify(categories));

  for (const category of categories) {
    console.log("TRY SUGGESTION CATEGORY:", category);

    const smart = getSmartRecommendationsByCategory(
        category,
        userOrders,
        allOrders,
        foods,
        drinks,
        1,
    );

    console.log("SMART SUGGESTION:", JSON.stringify(smart));

    if (smart && smart.length) {
      return {
        category,
        itemName: smart[0],
      };
    }

    const menu = category === "pice" ? drinks : foods;

    const fallback = (menu || []).find((item) =>
      item && menuItemMatchesRecommendationCategory(item, category),
    );

    console.log(
        "FALLBACK SUGGESTION:",
        fallback ? fallback.name : null,
    );

    if (fallback) {
      return {
        category,
        itemName: fallback.name,
      };
    }
  }

  return null;
}

function buildAfterOrderSuggestion({
  addedItems,
  foods,
  drinks,
  userOrders,
  allOrders,
}) {
  if (!addedItems || !addedItems.length) return null;

  const profile = analyzeAddedItems(addedItems, foods, drinks);
  console.log("AFTER ORDER PROFILE:", JSON.stringify(profile));

  if (profile.hasCoffee && !profile.hasDessert) {
    return pickSuggestionFromCategories(
        ["desert", "tost", "sendvic"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  if (profile.hasDessert && !profile.hasCoffee) {
    return pickSuggestionFromCategories(
        ["pice"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  if (profile.hasSalad && !profile.hasDrink) {
    return pickSuggestionFromCategories(
        ["pice", "tost", "sendvic"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  if (profile.hasSoup && !profile.hasMain) {
    return pickSuggestionFromCategories(
        ["pasta", "glavno", "salata"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  if (profile.hasMain && !profile.hasDrink) {
    return pickSuggestionFromCategories(
        ["pice", "desert"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  if (profile.hasDrink && !profile.hasMain && !profile.hasDessert) {
    return pickSuggestionFromCategories(
        ["sendvic", "tost", "desert"],
        foods,
        drinks,
        userOrders,
        allOrders,
    );
  }

  return null;
}


function buildAfterOrderSuggestions({
  addedItems,
  foods,
  drinks,
  userOrders,
  allOrders,
  limit = 3,
}) {
  if (!addedItems || !addedItems.length) return [];

  const suggestions = [];
  const used = new Set();
  const profile = analyzeAddedItems(addedItems, foods, drinks);

  function addFromCategories(categories) {
    for (const category of categories) {
      const smart = getSmartRecommendationsByCategory(
          category,
          userOrders,
          allOrders,
          foods,
          drinks,
          limit,
      );

      for (const itemName of smart) {
        const key = normalizeText(itemName);

        if (!used.has(key)) {
          suggestions.push({category, itemName});
          used.add(key);
        }

        if (suggestions.length >= limit) return;
      }
    }
  }

  if (profile.hasCoffee && !profile.hasDessert) {
    addFromCategories(["desert", "tost", "sendvic"]);
  } else if (profile.hasDessert && !profile.hasCoffee) {
    addFromCategories(["pice"]);
  } else if (profile.hasSalad && !profile.hasDrink) {
    addFromCategories(["pice", "tost", "sendvic"]);
  } else if (profile.hasSoup && !profile.hasMain) {
    addFromCategories(["pasta", "glavno", "salata"]);
  } else if (profile.hasMain && !profile.hasDrink) {
    addFromCategories(["pice", "desert"]);
  } else if (profile.hasDrink && !profile.hasMain && !profile.hasDessert) {
    addFromCategories(["sendvic", "tost", "desert"]);
  }

  return suggestions.slice(0, limit);
}

function buildAfterOrderSuggestionsText(suggestions) {
  if (!suggestions || !suggestions.length) return "";

  return `\n\nUz to ti mogu predložiti:\n${suggestions
      .map((s) => `- ${s.itemName}`)
      .join("\n")}\n\nŽeliš nešto od toga?`;
}


module.exports = {
  analyzeAddedItems,
  buildAfterOrderSuggestion,
  buildAfterOrderSuggestions,
  buildAfterOrderSuggestionsText,
};