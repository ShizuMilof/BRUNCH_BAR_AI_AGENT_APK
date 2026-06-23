// src/menu/itemResolver.js

const {normalizeText} = require("../utils/normalize");

function getItemName(item) {
  return item.name || item.title || item.itemName || "";
}

function getAliases(item) {
  if (Array.isArray(item.aliasi)) return item.aliasi;
  if (Array.isArray(item.aliases)) return item.aliases;
  if (Array.isArray(item.alias)) return item.alias;
  if (typeof item.alias === "string") return [item.alias];

  return [];
}

function getAllMenuItems(foods, drinks) {
  return [
    ...(foods || []).map((item) => ({...item, type: "food"})),
    ...(drinks || []).map((item) => ({...item, type: "drink"})),
  ];
}

function findMatches(requestedName, menuItems) {
  const normalizedRequested = normalizeText(requestedName);

  if (!normalizedRequested) return [];

  const exactMatches = menuItems.filter((item) =>
    normalizeText(getItemName(item)) === normalizedRequested,
  );

  if (exactMatches.length > 0) return exactMatches;

  const aliasMatches = menuItems.filter((item) =>
    getAliases(item).some((alias) =>
      normalizeText(alias) === normalizedRequested,
    ),
  );

  if (aliasMatches.length > 0) return aliasMatches;

  return menuItems.filter((item) => {
    const searchNames = [
      getItemName(item),
      ...getAliases(item),
    ]
        .filter(Boolean)
        .map((value) => normalizeText(value));

    return searchNames.some((searchName) =>
      searchName.includes(normalizedRequested) ||
     normalizedRequested.includes(searchName),
    );
  });
}

function resolveRequestedItems(requestedItems, foods, drinks) {
  const menuItems = getAllMenuItems(foods, drinks);

  const resolvedItems = [];
  const ambiguous = [];
  const missing = [];

  for (const requested of requestedItems || []) {
    const name = requested.name || requested.item || requested.text || "";
    const quantity = requested.quantity || 1;

    const matches = findMatches(name, menuItems);

    if (matches.length === 1) {
      resolvedItems.push({
        requestedName: name,
        quantity,
        item: matches[0],
      });
    } else if (matches.length > 1) {
      ambiguous.push({
        requestedName: name,
        quantity,
        options: matches,
      });
    } else {
      missing.push({
        requestedName: name,
        quantity,
      });
    }
  }

  return {
    resolvedItems,
    ambiguous,
    missing,
  };
}

module.exports = {
  resolveRequestedItems,
};
