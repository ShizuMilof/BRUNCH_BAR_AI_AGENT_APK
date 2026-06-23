const {
  normalizeText,
} = require("../utils/normalize");

const {
  findMenuItemFromMessage,
} = require("../menu/menuLookup");



function hasTag(item, tag) {
  const tags = item && item.tags ? item.tags : {};

  if (Array.isArray(tags)) {
    return tags.includes(tag);
  }

  return tags[tag] === true || tags[tag] === tag;
}

function isDrink(item) {
  const category = normalizeText((item && item.category) || "");
  const name = normalizeText((item && item.name) || "");

  return (
    category.includes("sok") ||
    category.includes("pice") ||
    category.includes("kava") ||
    category.includes("caj") ||
    name.includes("cola") ||
    name.includes("voda")
  );
}

function isCoffee(item) {
  const category = normalizeText((item && item.category) || "");
  const name = normalizeText((item && item.name) || "");

  return (
    category.includes("kava") ||
    name.includes("espresso") ||
    name.includes("kava")
  );
}

function isDessert(item) {
  const category = normalizeText((item && item.category) || "");
  return category.includes("desert");
}

function isMain(item) {
  const role = normalizeText((item && item.mealRole) || "");
  const category = normalizeText((item && item.category) || "");

  return (
    role === "main" ||
    role === "light_main" ||
    category.includes("pizza") ||
    category.includes("tijesto") ||
    category.includes("salata") ||
    category.includes("sendvic") ||
    category.includes("tost")
  );
}

function getPopularNames(items, limit = 3) {
  return (items || [])
      .filter((item) => item && item.dostupno !== false)
      .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0))
      .slice(0, limit)
      .map((item) => item.name);
}

function getPairingRecommendationsForItem(item, foods, drinks, limit = 3) {
  if (!item) return [];

  if (isCoffee(item)) {
    return getPopularNames(
        (foods || []).filter((food) => hasTag(food, "uz_kavu")),
        limit,
    );
  }

  if (isDrink(item)) {
    return getPopularNames(
        (foods || []).filter((food) => hasTag(food, "uz_pice")),
        limit,
    );
  }

  if (isDessert(item)) {
    return getPopularNames(
        (drinks || []).filter((drink) => isCoffee(drink) || hasTag(drink, "uz_desert")),
        limit,
    );
  }

  if (isMain(item)) {
    const drinkNames = getPopularNames(drinks || [], 2);
    const dessertNames = getPopularNames(
        (foods || []).filter((food) => isDessert(food)),
        1,
    );

    return [...drinkNames, ...dessertNames].slice(0, limit);
  }

  return getPopularNames(foods, limit);
}

function isPairingQuestion(message) {
  const text = normalizeText(message || "");

  return (
    text.includes("uz ") ||
    text.includes("sta ide uz") ||
    text.includes("sto ide uz") ||
    text.includes("što ide uz") ||
    text.includes("s cim") ||
    text.includes("s čim")
  );
}

function buildPairingRecommendationResponse({
  message,
  nickname,
  foods,
  drinks,
  buildResponse,
}) {
  if (!isPairingQuestion(message)) return null;

  const item = findMenuItemFromMessage(message, foods, drinks);

  if (!item) {
    return buildResponse(
        "recommendation",
        `${nickname}, uz što želiš preporuku? Možeš napisati npr. "što ide uz kavu" ili "što ide uz pizzu".`,
        [],
        [],
    );
  }

  const recommendations = getPairingRecommendationsForItem(
      item,
      foods,
      drinks,
      3,
  );

  if (!recommendations.length) {
    return buildResponse(
        "recommendation",
        `${nickname}, trenutno nemam dobru preporuku uz ${item.name}.`,
        [],
        [],
    );
  }

  return buildResponse(
      "recommendation",
      `${nickname}, uz ${item.name} bih preporučio:\n\n${recommendations
          .map((name) => `- ${name}`)
          .join("\n")}`,
      recommendations,
      [],
      {
        lastSuggestedItems: recommendations,
      },
  );
}

module.exports = {
  isPairingQuestion,
  getPairingRecommendationsForItem,
  buildPairingRecommendationResponse,
};