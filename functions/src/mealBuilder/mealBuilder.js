const {normalizeText} = require("../utils/normalize");

function isMealBuilderIntent(message) {
  const text = normalizeText(message || "");

  return (
    text.includes("slozi mi") ||
    text.includes("slozi rucak") ||
    text.includes("slozi veceru") ||
    text.includes("naruci mi nesto") ||
    text.includes("narucio bi nesto") ||
    text.includes("jeo bi  nesto") ||
    text.includes("gladan sam") ||
    text.includes("htio bih") ||
    text.includes("htjela bih")
  );
}

function pickPopularByFilter(foods, filterFn) {
  return (foods || [])
      .filter((item) => item && item.dostupno !== false)
      .filter(filterFn)
      .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0))[0];
}

function hasTag(item, tag) {
  const tags = item && item.tags ? item.tags : {};
  return tags[tag] === true || tags[tag] === tag;
}

function buildMealSuggestion({message, foods}) {
  const text = normalizeText(message || "");
  const suggestions = [];

  if (text.includes("juha") || text.includes("juhu")) {
    const soup = pickPopularByFilter(foods, (item) =>
      normalizeText(item.category || "") === "juha" ||
      normalizeText(item.mealRole || "") === "starter" ||
      hasTag(item, "predjelo"),
    );

    if (soup) suggestions.push(soup.name);
  }

  if (
    text.includes("pasta") ||
    text.includes("pasti") ||
    text.includes("tjestenina") ||
    text.includes("tijesto") ||
    text.includes("pasta")
  ) {
    const pasta = pickPopularByFilter(foods, (item) =>
      normalizeText(item.category || "") === "tijesto",
    );

    if (pasta) suggestions.push(pasta.name);
  }

  if (
    text.includes("meso") ||
    text.includes("mesno") ||
    text.includes("glavno")
  ) {
    const meat = pickPopularByFilter(foods, (item) =>
      normalizeText(item.category || "") === "glavno" ||
      hasTag(item, "meso") ||
      hasTag(item, "proteini"),
    );

    if (meat) suggestions.push(meat.name);
  }

  if (
    text.includes("gladan sam") ||
    text.includes("naruci mi nesto") ||
    text.includes("naruči mi nešto") ||
    text.includes("slozi mi rucak") ||
    text.includes("složi mi ručak")
  ) {
    const mains = (foods || [])
        .filter((item) => item && item.dostupno !== false)
        .filter((item) =>
          normalizeText(item.mealRole || "") === "main",
        )
        .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0))
        .slice(0, 2)
        .map((item) => item.name);

    suggestions.push(...mains);
  }

  return [...new Set(suggestions)];
}
module.exports = {
  isMealBuilderIntent,
  buildMealSuggestion,
};