/* eslint-disable */

const {
  buildAction,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

function buildCartResponse(nickname, cartItems) {
  const items = Array.isArray(cartItems) ?
    cartItems.filter((item) => typeof item === "string" && item.trim()) :
    [];

  if (!items.length) {
    return buildResponse(
      "cart_preview",
      `${nickname}, tvoja košarica je trenutno prazna.`,
      [],
      [
        buildAction("open_menu_browser", "Dodaj artikle"),
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

    const modsMatch = item.match(
      /MODIFIKACIJE:([\s\S]*?)(?:\n\nNAPOMENA:|\s*\(X\d+\)|$)/i,
    );
    const mods = modsMatch ? modsMatch[1].trim() : "";

    const noteMatch = item.match(
      /NAPOMENA:([\s\S]*?)(?:\s*\(X\d+\)|$)/i,
    );
    const note = noteMatch ? noteMatch[1].trim() : "";

    let text = `- ${base.toLowerCase()}`;

    const details = [];

    if (mods) {
      details.push(`modifikacije: ${mods.toLowerCase()}`);
    }

    if (note) {
      details.push(`napomena: ${note.toLowerCase()}`);
    }

    if (details.length > 0) {
      text += ` -> ${details.join(", ")}`;
    }

    if (quantity > 1) {
      text += ` x${quantity}`;
    }

    return text;
  });

  return buildResponse(
    "cart_preview",
    `${nickname}, u tvojoj košarici imaš:\n\n${formattedItems.join("\n\n")}`,
    items,
    [
      buildAction("go_to_cart", "Završi narudžbu"),
      buildAction("open_menu_browser", "Dodaj još"),
      buildAction("open_home", "Početak"),
    ],
  );
}

module.exports = {
  buildCartResponse,
};