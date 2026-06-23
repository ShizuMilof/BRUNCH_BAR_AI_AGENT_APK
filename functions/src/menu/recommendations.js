/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  normalizeText,
} = require("../utils/normalize");

const {
  extractBaseItemName,
  getOrderItems,
} = require("../orders/orderHelpers");

const {
  buildMenuNameSet,
} = require("../ai/orderParser");

function buildCategoryRecommendations(userOrders, foods, drinks, limit = 3) {
  const menu = [...foods, ...drinks];

const deliveredOrders = userOrders.filter(Boolean);

  const categories = new Map();

  deliveredOrders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const base = extractBaseItemName(item);

      const found = menu.find((m) => m.name === base);
      if (!found) return;

      const cat = found.category || "ostalo";

      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
  });

  // sortiraj kategorije po učestalosti
  const sortedCats = [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

  const result = [];

  sortedCats.forEach((cat) => {
    menu.forEach((item) => {
      if (
        item.category === cat &&
        !result.includes(item.name)
      ) {
        result.push(item.name);
      }
    });
  });

  return result.slice(0, limit);
}

function getPopularCategoryFromMessage(message) {
  const text = normalizeText(message);

  if (text.includes("desert") || text.includes("kolac") || text.includes("kolač")) return "desert";
  if (text.includes("pizza") || text.includes("pizze")) return "pizza";
  if (text.includes("sendvic") || text.includes("sendvič")) return "sendvic";
  if (text.includes("salata")) return "salata";
  if (text.includes("pasta") || text.includes("tjestenina") || text.includes("tijesto")) return "tijesto";
  if (text.includes("pice") || text.includes("piće") || text.includes("sok") || text.includes("kava")) return "pice";

  return "";
}

function countTopOrderedItems(orders, limit = 3) {
  const counts = new Map();

  orders.forEach((order) => {
    getOrderItems(order).forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);
      if (!baseName) return;

      const quantityMatch = rawItem.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      const current = counts.get(baseName) || 0;

      counts.set(baseName, current + quantity);
    });
  });

  return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
}

function buildFavoritesRecommendationsGrouped(
    userOrders,
    foods,
    drinks,
) {
  const menu = [].concat(foods, drinks);

  const grouped = {
    predjelo: [],
    glavno: [],
    desert: [],
    pice: [],
  };

  const completedOrders = userOrders.filter(
      (order) => normalizeText(order.status || "") === "dostavljeno",
  );

  completedOrders.forEach((order) => {
    const items = getOrderItems(order);

    items.forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);

      const menuItem = menu.find(
          (item) =>
            normalizeText(item.name || "") === normalizeText(baseName),
      );

      if (!menuItem) return;

      const category = normalizeText(menuItem.category || "");

      // GLAVNA JELA
      if (
        category.includes("pizza") ||
        category.includes("tjestenina") ||
        category.includes("tijesto") ||
        category.includes("pasta") ||
        category.includes("sendvic") ||
        category.includes("sendvič")
      ) {
        grouped.glavno.push(menuItem.name);
      }

      // DESERTI
      else if (
        category.includes("desert") ||
        category.includes("palacinke") ||
        category.includes("palačinke") ||
        category.includes("sladoled")
      ) {
        grouped.desert.push(menuItem.name);
      }

      // PIĆA
      else if (
        category.includes("sok") ||
        category.includes("kava") ||
        category.includes("caj") ||
        category.includes("čaj") ||
        category.includes("pice") ||
        category.includes("piće")
      ) {
        grouped.pice.push(menuItem.name);
      }

      // OSTALO = PREDJELO
      else {
        grouped.predjelo.push(menuItem.name);
      }
    });
  });

  // makni duplikate
  grouped.predjelo = [...new Set(grouped.predjelo)];
  grouped.glavno = [...new Set(grouped.glavno)];
  grouped.desert = [...new Set(grouped.desert)];
  grouped.pice = [...new Set(grouped.pice)];

  // limit po kategoriji
  grouped.predjelo = grouped.predjelo.slice(0, 2);
  grouped.glavno = grouped.glavno.slice(0, 2);
  grouped.desert = grouped.desert.slice(0, 2);
  grouped.pice = grouped.pice.slice(0, 2);

  return grouped;
}

function buildPopularItems(allOrders, foods, drinks, limitPerCategory = 1) {
  const menu = [...foods, ...drinks];
  const menuByName = new Map(menu.map((item) => [item.name, item]));

  const deliveredOrders = allOrders.filter((order) =>
    normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
  );

  const counts = new Map();

  deliveredOrders.forEach((order) => {
    getOrderItems(order).forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);
      if (!menuByName.has(baseName)) return;

      const quantityMatch = rawItem.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      counts.set(baseName, (counts.get(baseName) || 0) + quantity);
    });
  });

  const byCategory = new Map();

  [...counts.entries()].forEach(([name, count]) => {
    const item = menuByName.get(name);
    const category = (item && item.category) || "OSTALO";

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }

    byCategory.get(category).push({name, count});
  });

  const result = [];

  [...byCategory.entries()]
      .sort(([catA], [catB]) => catA.localeCompare(catB, "hr"))
      .forEach(([category, items]) => {
        const popularInCategory = items
            .sort((a, b) => b.count - a.count)
            .slice(0, limitPerCategory)
            .map((item) => item.name);

        if (popularInCategory.length > 0) {
          result.push(`${category}: ${popularInCategory.join(", ")}`);
        }
      });

  return result;
}


function buildPersonalRecommendations(userOrders, foods, drinks, limit = 3) {
  const availableNames = buildMenuNameSet(foods, drinks);

  const deliveredOrders = userOrders.filter((order) =>
    normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
  );

  return countTopOrderedItems(deliveredOrders, 20)
      .filter((name) => availableNames.has(name))
      .slice(0, limit);
}




function buildFavoritesRecommendations(userOrders, foods, drinks, limit = 3) {
  return buildPersonalRecommendations(userOrders, foods, drinks, limit);
}





function buildSimilarRecommendations(userOrders, foods, drinks, limit = 3) {
  const favorites = buildPersonalRecommendations(userOrders, foods, drinks, 10);
  const favoriteSet = new Set(favorites);

  const categoryItems = buildCategoryRecommendations(userOrders, foods, drinks, 20);

  return categoryItems
      .filter((item) => !favoriteSet.has(item))
      .slice(0, limit);
}


function buildNewRecommendations(userOrders, foods, drinks, limit = 3) {
  const deliveredOrders = userOrders.filter((order) =>
    normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
  );

  const alreadyOrdered = new Set(
      deliveredOrders.flatMap((order) =>
        getOrderItems(order).map((item) => extractBaseItemName(item)),
      ),
  );

  const allMenuItems = [...foods, ...drinks]
      .map((item) => (item && item.name))
      .filter(Boolean);

  const categoryItems = buildCategoryRecommendations(userOrders, foods, drinks, 50);

  const newFromFavoriteCategories = categoryItems
      .filter((item) => !alreadyOrdered.has(item));

  if (newFromFavoriteCategories.length > 0) {
    return newFromFavoriteCategories.slice(0, limit);
  }

  const anyNewItems = allMenuItems.filter((item) => !alreadyOrdered.has(item));

  return anyNewItems.slice(0, limit);
}

function getRecommendedDrinksForItems(items, foods, drinks) {
  const result = [];

  items.forEach((rawItem) => {
    const baseName = extractBaseItemName(rawItem);

    const food = foods.find((f) =>
      normalizeText(f.name) === normalizeText(baseName),
    );

    if (!food || !food.preporucenaPica) return;

    const recommended = Object.keys(food.preporucenaPica)
        .filter((id) => food.preporucenaPica[id])
        .map((id) => {
          const drink = drinks.find((d) => String(d.id) === String(id));
          return drink ? drink.name : undefined;
        }) .filter(Boolean);

    if (recommended.length > 0) {
      result.push({
        food: food.name,
        drinks: [...new Set(recommended)].slice(0, 2),
      });
    }
  });

  return result;
}



function buildPopularItemsByCategory(allOrders, foods, drinks, wantedCategory, limit = 3) {
console.log("WANTED CATEGORY:", wantedCategory);
  const menu = [...foods, ...drinks];
  const menuByName = new Map(menu.map((item) => [item.name, item]));
  const normalizedWanted = normalizeText(wantedCategory);

  const deliveredOrders = allOrders.filter((order) =>
    normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
  );

  const counts = new Map();

  deliveredOrders.forEach((order) => {
    getOrderItems(order).forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);
      const menuItem = menuByName.get(baseName);
      if (!menuItem) return;

      const itemCategory = normalizeText(menuItem.category || "");
      const itemName = normalizeText(menuItem.name || "");
      console.log(
        "POPULAR CATEGORY CHECK",
        menuItem.name,
        menuItem.category,
        normalizedWanted
      );
      const matchesCategory =
        itemCategory.includes(normalizedWanted) ||
        itemName.includes(normalizedWanted);

      if (!matchesCategory) return;

      const quantityMatch = rawItem.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      counts.set(baseName, (counts.get(baseName) || 0) + quantity);
    });
  });

  return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
}

module.exports = {
  buildCategoryRecommendations,
  countTopOrderedItems,
  buildPopularItems,
  buildPersonalRecommendations,
  buildFavoritesRecommendations,
  buildSimilarRecommendations,
  buildNewRecommendations,
  getRecommendedDrinksForItems,
  buildFavoritesRecommendationsGrouped,
  buildPopularItemsByCategory
};