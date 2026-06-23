const {
  normalizeText,
} = require("../utils/normalize");

const {
  extractBaseItemName,
} = require("../orders/orderHelpers");

const {
  findMenuItemByName,
} = require("../menu/menuLookup");

function hasTag(item, tag) {
  const tags = item && item.tags ? item.tags : {};

  if (Array.isArray(tags)) {
    return tags.includes(tag);
  }

  return tags[tag] === true || tags[tag] === tag;
}

function getMenuItemFromCartItem(rawItem, foods, drinks) {
  const baseName = extractBaseItemName(rawItem);
  return findMenuItemByName(baseName, foods, drinks);
}

function getProfileFromItems(rawItems, foods, drinks) {
  const menuItems = (rawItems || [])
      .map((item) => getMenuItemFromCartItem(item, foods, drinks))
      .filter(Boolean);

  const categories = menuItems.map((item) =>
    normalizeText(item.category || ""),
  );

  const roles = menuItems.map((item) =>
    normalizeText(item.mealRole || ""),
  );

  const hasDrink = categories.some((c) =>
    c.includes("pice") ||
    c.includes("sok") ||
    c.includes("kava") ||
    c.includes("caj"),
  );

  const hasCoffee = categories.some((c) =>
    c.includes("kava"),
  ) || menuItems.some((item) => hasTag(item, "kava"));

  const hasDessert = roles.includes("dessert") ||
    categories.some((c) => c.includes("desert"));

  const hasMain = roles.includes("main") ||
    roles.includes("light_main") ||
    categories.some((c) =>
      c.includes("pizza") ||
      c.includes("tijesto") ||
      c.includes("sendvic") ||
      c.includes("salata") ||
      c.includes("vege") ||
      c.includes("tost"),
    );

  const hasSnack = roles.includes("snack");

  return {
    menuItems,
    hasDrink,
    hasCoffee,
    hasDessert,
    hasMain,
    hasSnack,
  };
}

function getPopularFoodByRoleOrTag(foods, options = {}) {
  const {
    role = "",
    tag = "",
    limit = 3,
  } = options;

  return (foods || [])
      .filter((item) => item && item.dostupno !== false)
      .filter((item) => {
        if (role && normalizeText(item.mealRole || "") !== normalizeText(role)) {
          return false;
        }

        if (tag && !hasTag(item, tag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0))
      .slice(0, limit)
      .map((item) => item.name);
}

function getPopularDrinks(drinks, limit = 3) {
  return (drinks || [])
      .filter((item) => item && item.dostupno !== false)
      .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0))
      .slice(0, limit)
      .map((item) => item.name);
}

function removeAlreadySelectedSuggestions(suggestions, allItems) {
  const selectedNames = new Set(
      (allItems || []).map((item) =>
        normalizeText(extractBaseItemName(item)),
      ),
  );

  return (suggestions || []).filter((name) =>
    !selectedNames.has(normalizeText(name)),
  );
}
function buildCartBasedSuggestions({
  cartItems,
  addedItems,
  foods,
  drinks,
  limit = 3,
}) {
  const allItems = [
    ...(cartItems || []),
    ...(addedItems || []),
  ];

  if (!allItems.length) return [];

  const profile = getProfileFromItems(allItems, foods, drinks);
  if (profile.hasDessert && profile.hasCoffee) {
    return [];
  }
  let suggestions = [];

  if (profile.hasMain && profile.hasDrink && !profile.hasDessert) {
    suggestions = getPopularFoodByRoleOrTag(foods, {
      role: "dessert",
      limit,
    });
  } else if (profile.hasMain && !profile.hasDrink) {
    suggestions = [
      ...getPopularDrinks(drinks, 2),
      ...getPopularFoodByRoleOrTag(foods, {
        role: "dessert",
        limit: 1,
      }),
    ];
  } else if (profile.hasDrink && !profile.hasMain && !profile.hasDessert) {
    suggestions = getPopularFoodByRoleOrTag(foods, {
      tag: "uz_pice",
      limit,
    });
  } else if (profile.hasCoffee && !profile.hasDessert) {
    suggestions = getPopularFoodByRoleOrTag(foods, {
      tag: "uz_kavu",
      limit,
    });
  } else if (profile.hasDessert && !profile.hasCoffee) {
    suggestions = getPopularDrinks(drinks, limit);
  }

  return removeAlreadySelectedSuggestions(suggestions, allItems).slice(0, limit);
}


function buildCartBasedSuggestionsText(suggestions) {
  if (!suggestions || !suggestions.length) return "";

  return `\n\nS obzirom na košaricu, mogu još predložiti:\n${suggestions
      .map((name) => `- ${name}`)
      .join("\n")}\n\nŽeliš nešto od toga?`;
}

module.exports = {
  buildCartBasedSuggestions,
  buildCartBasedSuggestionsText,
};