/* eslint-disable require-jsdoc */
function extractBaseItemName(orderItem) {
  if (!orderItem || typeof orderItem !== "string") {
    return "";
  }

  return orderItem
      .split("\n")[0]
      .replace(/\(X\d+\)/i, "")
      .trim();
}

function extractNote(item) {
  const match = item.match(
      /NAPOMENA:\s*([\s\S]*?)(?:\s*\(X\d+\)|$)/i,
  );

  return match ? match[1].trim() : "";
}

function getOrderItems(order) {
  if (!order || !Array.isArray(order.stavke)) {
    return [];
  }

  return order.stavke.filter(
      (item) => typeof item === "string" && item.trim(),
  );
}

function sortOrdersByCreatedAtDesc(orders) {
  return [].concat(orders).sort((a, b) => {
    const aTime = Number((a && a.createdAt) || 0);
    const bTime = Number((b && b.createdAt) || 0);

    return bTime - aTime;
  });
}

module.exports = {
  extractBaseItemName,
  extractNote,
  getOrderItems,
  sortOrdersByCreatedAtDesc,
};
