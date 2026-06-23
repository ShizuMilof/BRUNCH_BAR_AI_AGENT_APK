/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  normalizeText,
} = require("../utils/normalize");

function centToEur(cents) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

function mapRecommendedDrinks(preporucenaPica, drinks) {
  if (!preporucenaPica) return [];

  const ids = Object.keys(preporucenaPica)
    .filter((key) => preporucenaPica[key]);

  return ids
    .map((id) => {
      const drink = drinks.find((d) => String(d.id) === String(id));
      return drink ? drink.name : undefined;
    })
    .filter(Boolean);
}

function buildMenuContext(foods, drinks) {
  return {
    hrana: foods.map((f) => ({
      naziv: f.name || "",
      kategorija: f.category || "",
      cijenaCent: typeof f.cijenaCent === "number" ? f.cijenaCent : null,
      cijenaEur: centToEur(f.cijenaCent),
      opis: f.opis || "",
      dostupno: f.dostupno !== false,
      alergeni: f.alergeni || {},
      oznake: {
        ljuto: f.oznake && f.oznake.ljuto === true,
        vegansko: f.oznake && f.oznake.vegansko === true,
        vegetarijansko: f.oznake && f.oznake.vegetarijansko === true,
      },
      preporucenaPica: mapRecommendedDrinks(f.preporucenaPica, drinks),
    })),
    pica: drinks.map((d) => ({
      naziv: d.name || "",
      kategorija: d.category || "",
      cijenaCent: typeof d.cijenaCent === "number" ? d.cijenaCent : null,
      cijenaEur: centToEur(d.cijenaCent),
      opis: d.opis || "",
      dostupno: d.dostupno !== false,
      alergeni: d.alergeni || {},
      oznake: {
        ljuto: d.oznake && d.oznake.ljuto === true,
        vegansko: d.oznake && d.oznake.vegansko === true,
        vegetarijansko: d.oznake && d.oznake.vegetarijansko === true,
      },
    })),
  };
}

function formatContextJson(foods, drinks) {
  return JSON.stringify(buildMenuContext(foods, drinks), null, 2);
}

function buildAllMenuNames(foods, drinks) {
  return [].concat(foods, drinks)
    .map((item) => ((item && item.name) || "").trim())
    .filter(Boolean);
}

function extractExactMenuMatches(message, foods, drinks) {
  const text = normalizeText(message);
  const menuNames = buildAllMenuNames(foods, drinks);

  return menuNames.filter((name) => {
    const normalizedName = normalizeText(name);
    return normalizedName && text.includes(normalizedName);
  });
}

function getActiveAllergens(item) {
  const alergeni = (item && item.alergeni) || {};

  return Object.entries(alergeni)
    .filter((entry) => entry[1] === true)
    .map((entry) => entry[0]);
}

module.exports = {
  centToEur,
  mapRecommendedDrinks,
  buildMenuContext,
  formatContextJson,
  buildAllMenuNames,
  extractExactMenuMatches,
  getActiveAllergens,
};