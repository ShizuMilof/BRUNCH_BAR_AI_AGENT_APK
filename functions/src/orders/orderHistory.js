/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  buildAction,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

const {
  sortOrdersByCreatedAtDesc,
  getOrderItems,
} = require("./orderHelpers");

const {
  normalizeText,
} = require("../utils/normalize");


function buildLastAnyOrderResponse(nickname, order) {
  if (!order) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ],
    );
  }

  const items = getOrderItems(order);
  const status = order.status || "Nepoznat status";

  return buildResponse(
    "last_any_order_actions",
    items.length > 0 ?
      `${nickname}, tvoja zadnja narudžba je: ${items.join(", ")}. Status: ${status}.` :
      `${nickname}, pronašao sam tvoju zadnju narudžbu, ali nema stavki za prikaz. Status: ${status}.`,
    items,
    [
      buildAction("repeat_last_any_order_submit", "Naruči ponovno"),
      buildAction("repeat_last_any_order_to_cart", "Prilagodi narudžbu"),
      buildAction("open_home", "Početak"),
    ],
  );
}

function buildLastDeliveredOrderResponse(nickname, items) {
  if (!items.length) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ],
    );
  }

  return buildResponse(
    "last_delivered_order_actions",
    `${nickname}, ovo je tvoja zadnja dostavljena narudžba: ${items.join(", ")}.`,
    items,
    [
      buildAction("repeat_last_order_submit", "Naruči ponovno"),
      buildAction("repeat_last_order_to_cart", "Prilagodi narudžbu"),
      buildAction("open_home", "Početak"),
    ],
  );
}

function buildRepeatLastOrderSubmitResponse(nickname, items) {
  return buildResponse(
    "repeat_last_order_submit",
    items.length > 0 ?
      `${nickname}, želiš li odmah poslati ovu narudžbu u kuhinju: ${items.join(", ")}?` :
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
    items,
    [],
  );
}

function buildRepeatLastOrderToCartResponse(nickname, items) {
  return buildResponse(
    "repeat_last_order_to_cart",
    items.length > 0 ?
      `${nickname}, mogu prebaciti tvoju zadnju dostavljenu narudžbu u košaricu za prilagodbu: ${items.join(", ")}. Želiš li to?` :
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
    items,
    [],
  );
}

function buildRepeatLastAnyOrderSubmitResponse(nickname, items) {
  return buildResponse(
    "repeat_last_any_order_submit",
    items.length > 0 ?
      `${nickname}, želiš li odmah poslati ovu narudžbu u kuhinju: ${items.join(", ")}?` :
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
    items,
    [],
  );
}

function buildRepeatLastAnyOrderToCartResponse(nickname, items) {
  return buildResponse(
    "repeat_last_any_order_to_cart",
    items.length > 0 ?
      `${nickname}, mogu prebaciti tvoju zadnju narudžbu u košaricu za prilagodbu: ${items.join(", ")}. Želiš li to?` :
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
    items,
    [],
  );
}

function formatHistoryOrderShort(order) {
  const items = getOrderItems(order);

  if (!items.length) {
    return "bez stavki";
  }

  return items
    .slice(0, 3)
    .map((item) => {
      const base = item
        .split("\n")[0]
        .replace(/\(X\d+\)/i, "")
        .trim();

      const quantityMatch = item.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      return quantity > 1 ? `${base} x${quantity}` : base;
    })
    .join(", ");
}


function buildOrderHistoryResponse(nickname, userOrders) {
  const deliveredOrders = sortOrdersByCreatedAtDesc(
      userOrders.filter((order) =>
        normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
      ),
  );

  if (!deliveredOrders.length) {
    return buildResponse(
        "order_history",
        `${nickname}, još nemaš dostavljenih narudžbi.`,
        [],
        [],
    );
  }

  const text = deliveredOrders
      .slice(0, 5)
      .map((order, index) => {
        const items = getOrderItems(order);

        return `Narudžba ${index + 1}\n${items.map((item) => `- ${item}`).join("\n")}`;
      })
      .join("\n\n");

  return buildResponse(
      "order_history",
      `${nickname}, ovo su tvoje zadnje narudžbe:\n\n${text}\n\nMožeš napisati npr. "prikaži narudžbu broj 2".`,
      [],
      [],
  );
}

function buildHistoryOrderDetailResponse(nickname, order) {
  if (!order) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći tu narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ],
    );
  }

  const items = getOrderItems(order);
  const orderKey = order.key || order.id || "";

  if (!items.length) {
    return buildResponse(
      "history_order_detail",
      `${nickname}, pronašao sam narudžbu, ali nema stavki za prikaz.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ],
    );
  }

 const formattedItems = items.map((item) => {
   const base = item
       .split("\n")[0]
       .replace(/\(X\d+\)/i, "")
       .trim();

   const quantityMatch = item.match(/\(X(\d+)\)/i);
   const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

   const modsMatch = item.match(/MODIFIKACIJE:\s*([\s\S]*?)(?:\n\nNAPOMENA:|\s*\(X\d+\)|$)/i);
   const mods = modsMatch ? modsMatch[1].trim() : "";

   const noteMatch = item.match(/NAPOMENA:\s*([\s\S]*?)(?:\s*\(X\d+\)|$)/i);
   const note = noteMatch ? noteMatch[1].trim() : "";

   const lines = [
     quantity > 1 ? `- ${base} x${quantity}` : `- ${base}`,
   ];

   if (mods) {
     lines.push(`  Modifikacije: ${mods}`);
   }

   if (note) {
     lines.push(`  Napomena: ${note}`);
   }

    return lines.join("\n");
  });

  const itemsText = formattedItems.join("\n");

  return buildResponse(
      "history_order_detail",
      `${nickname}, ova narudžba sadrži:\n\n${itemsText}\n\nŽeliš li je naručiti ponovno ili uzeti samo dio?`,
      items,
      [],
      {
        orderId: orderKey,
      },
  );
}



module.exports = {
  buildLastAnyOrderResponse,
  buildLastDeliveredOrderResponse,
  buildRepeatLastOrderSubmitResponse,
  buildRepeatLastOrderToCartResponse,
  buildRepeatLastAnyOrderSubmitResponse,
  buildRepeatLastAnyOrderToCartResponse,
  buildOrderHistoryResponse,
  buildHistoryOrderDetailResponse,
};