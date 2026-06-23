/* eslint-disable require-jsdoc */
function normalizeText(text) {
  return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
}

function fixTypos(text) {
  return (text || "")
      .replace(/\baj\b/gi, "čaj")
      .replace(/\bcaj\b/gi, "čaj")
      .replace(/\bsecer\b/gi, "šećer")
      .replace(/\bnarance\b/gi, "naranče")
      .replace(/\blimunom\b/gi, "limunom");
}

function normalizeArray(val) {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val.filter(Boolean);
  }

  return Object.values(val).filter(Boolean);
}

function filterAvailable(items) {
  return items.filter((item) => item && item.dostupno !== false);
}

function sortByName(items) {
  return [].concat(items).sort((a, b) => {
    const nameA = ((a && a.name) || "").toString().toLowerCase();
    const nameB = ((b && b.name) || "").toString().toLowerCase();

    return nameA.localeCompare(nameB, "hr");
  });
}

module.exports = {
  normalizeText,
  fixTypos,
  normalizeArray,
  filterAvailable,
  sortByName,
};
