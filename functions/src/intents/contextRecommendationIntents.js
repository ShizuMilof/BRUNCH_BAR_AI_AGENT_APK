const {normalizeText} = require("../utils/normalize");

function isAskingLightFood(message) {
  const text = normalizeText(message);

  return (
    text.includes("lagano") ||
    text.includes("laganije")
  );
}

function isAskingHealthyFood(message) {
  const text = normalizeText(message);

  return (
    text.includes("zdravo") ||
    text.includes("zdravije")
  );
}

function isAskingCoffeePairing(message) {
  const text = normalizeText(message);

  return (
    text.includes("uz kavu") ||
    text.includes("uz kafu") ||
    text.includes("sto ide uz kavu") ||
    text.includes("a sto ide uz kavu") |
    text.includes("a što ide uz kavu") ||
    text.includes("što ide uz kavu") ||
    text.includes("šta bi islo  uz kavu") ||
    text.includes("a šta bi islo  uz kavu") ||
    text.includes("sta ide uz kavu") ||
    text.includes("šta ide uz kavu")
  );
}



function isHungryIntent(message) {
  const text = normalizeText(message);

  return (
    text.includes("gladan sam") ||
    text.includes("jako sam gladan")
  );
}

module.exports = {
  isAskingLightFood,
  isAskingHealthyFood,
  isAskingCoffeePairing,
  isHungryIntent,
};