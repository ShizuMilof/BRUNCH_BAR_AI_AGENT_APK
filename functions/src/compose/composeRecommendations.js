const {
  buildPopularItems,
  buildFavoritesRecommendations,
} = require("../menu/recommendations");

const {
  findMenuItemByName,
  menuItemMatchesRecommendationCategory,
  filterNamesByCategory,
} = require("../menu/menuLookup");


function getPopularRecommendationsByCategory(categoryKey, allOrders, foods, drinks, limit = 3) {
  const popular = buildPopularItems(allOrders, foods, drinks, 30);
  const popularNames = extractPopularItemNames(popular);

  return filterNamesByCategory(popularNames, categoryKey, foods, drinks).slice(0, limit);
}

function getPersonalRecommendationsByCategory(categoryKey, userOrders, foods, drinks, limit = 3) {
  const personal = buildFavoritesRecommendations(userOrders, foods, drinks, 30);

  return filterNamesByCategory(personal, categoryKey, foods, drinks).slice(0, limit);
}

function getFallbackRecommendationsByCategory(categoryKey, foods, drinks, limit = 3) {
  const menu = categoryKey === "pice" ? drinks : foods;

  return menu
      .filter((item) => menuItemMatchesRecommendationCategory(item, categoryKey))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((item) => item.name);
}


function getSmartRecommendationsByCategory(categoryKey, userOrders, allOrders, foods, drinks, limit = 3) {
  const personal = getPersonalRecommendationsByCategory(
      categoryKey,
      userOrders,
      foods,
      drinks,
      limit,
  );

  const popular = getPopularRecommendationsByCategory(
      categoryKey,
      allOrders,
      foods,
      drinks,
      limit,
  );

  const fallback = getFallbackRecommendationsByCategory(
      categoryKey,
      foods,
      drinks,
      limit,
  );

  return [...new Set([...personal, ...popular, ...fallback])].slice(0, limit);
}

function extractPopularItemNames(popularItems) {
  return popularItems.flatMap((entry) => {
    const parts = entry.split(":");
    if (parts.length < 2) return [entry.trim()];

    return parts[1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  });
}

module.exports = {
  getPopularRecommendationsByCategory,
  getPersonalRecommendationsByCategory,
  getFallbackRecommendationsByCategory,
  getSmartRecommendationsByCategory,
  extractPopularItemNames,
};
