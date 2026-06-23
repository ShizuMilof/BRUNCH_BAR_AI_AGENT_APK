/* eslint-disable require-jsdoc */
function buildAction(id, label) {
  return {
    id,
    label,
  };
}

function buildMainActions() {
  return [
    buildAction("open_new_order", "Nova narudžba"),
    buildAction("open_order_status", "Status narudžbe"),
    buildAction(
        "open_last_delivered_order",
        "Zadnja dostavljena narudžba",
    ),
    buildAction("open_last_any_order", "Zadnja narudžba"),
    buildAction(
        "open_personal_recommendations",
        "Preporuči mi nešto",
    ),
    buildAction("open_popular_items", "Što je popularno?"),
    buildAction("open_home", "Početak"),
  ];
}

function buildDefaultInfoActions() {
  return buildMainActions();
}

module.exports = {
  buildAction,
  buildMainActions,
  buildDefaultInfoActions,
};
