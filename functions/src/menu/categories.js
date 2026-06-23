/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  buildAction,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

function buildMenuCategoryActions(items, type) {
  const categories = [...new Set(
    items
      .map((item) => ((item && item.category) || "").trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, "hr"));

  const actions = categories.map((cat) =>
    buildAction(`menu_${type}_category|${cat}`, cat),
  );

  actions.push(buildAction("open_menu_browser", "Natrag na jelovnik"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildMenuItemActions(items, backAction) {
  const actions = items.slice(0, 10).map((item) =>
    buildAction(`pick_menu_item|${item.name}|${backAction}`, item.name),
  );

  actions.push(buildAction(backAction, "Natrag"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildMenuItemConfirmResponse(nickname, itemName, backAction) {
  return buildResponse(
    "menu_item_add",
    `${nickname}, želiš li dodati ${itemName} u narudžbu?`,
    [`${itemName}(X1)`],
    [
      buildAction(`confirm_menu_item_add|${itemName}|${backAction}`, "Dodaj"),
      buildAction(backAction, "Natrag"),
      buildAction("open_home", "Početak"),
    ],
  );
}

module.exports = {
  buildMenuCategoryActions,
  buildMenuItemActions,
  buildMenuItemConfirmResponse,
};