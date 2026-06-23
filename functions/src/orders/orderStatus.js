/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  normalizeText,
} = require("../utils/normalize");

const {
  buildAction,
  buildMainActions,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

const {
  getOrderItems,
  extractBaseItemName,
} = require("./orderHelpers");

function formatOrderItemsShort(order) {
  const items = getOrderItems(order);

  if (!items.length) {
    return "bez stavki";
  }

  return items
    .slice(0, 2)
    .map((item) => extractBaseItemName(item))
    .join(", ");
}

function buildOrderStatusResponse(nickname, activeOrder) {
  return buildResponse(
    "order_status",
    activeOrder ?
      `${nickname}, status tvoje zadnje aktivne narudžbe je: ${activeOrder.status || "Nepoznat status"}.` :
      `${nickname}, trenutačno nemaš aktivnu narudžbu.`,
    [],
    activeOrder ?
      [buildAction(`refresh_order_status|${activeOrder.key || activeOrder.id || ""}`, "Osvježi status")] :
      [],
  );
}

function buildOrderSelectionResponse(nickname, orders) {
  if (!orders.length) {
    return buildResponse(
      "reply",
      `${nickname}, trenutačno nemaš aktivnu narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ],
    );
  }

  if (orders.length === 1) {
    return buildSingleOrderStatusResponse(nickname, orders[0]);
  }

  const orderActions = orders.slice(0, 8).map((order, index) => {
    const label = `Narudžba ${index + 1}: ${formatOrderItemsShort(order)}`;
    return buildAction(`select_order_status|${order.key || order.id || index}`, label);
  });

  return buildResponse(
    "order_selection",
    `${nickname}, imaš više aktivnih narudžbi. Odaberi za koju želiš provjeriti status.`,
    [],
    [
      ...orderActions,
      buildAction("open_home", "Početak"),
    ],
  );
}

function buildSingleOrderStatusResponse(nickname, order) {
  if (!order) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći odabranu narudžbu.`,
      [],
      [
        buildAction("open_order_status", "Natrag"),
        buildAction("open_home", "Početak"),
      ],
    );
  }

  const items = getOrderItems(order);
  const status = order.status || "Nepoznat status";
  const orderKey = order.key || order.id || "";

  return buildResponse(
    "order_status",
    `${nickname}, status odabrane narudžbe je: ${status}. Stavke: ${items.join(", ")}.`,
    [],
    [
      buildAction(`refresh_order_status|${orderKey}`, "Osvježi status"),
      buildAction("open_order_status", "Natrag"),
      buildAction("open_home", "Početak"),
    ],
  );
}

module.exports = {
  formatOrderItemsShort,
  buildOrderStatusResponse,
  buildOrderSelectionResponse,
  buildSingleOrderStatusResponse,
};