const {
  normalizeText,
} = require("../utils/normalize");

function isAskingAboutLastOrder(message) {
  const text = normalizeText(message);
  const phrases = [
    "sto sam prosli put narucio",
    "sta sam prosli put narucio",
    "sto sam narucio prosli put",
    "sta sam narucio prosli put",
    "moja prosla narudzba",
    "prosla narudzba",
    "zadnja narudzba",
  ];
  return phrases.some((phrase) => text.includes(phrase));
}
module.exports = {
  isAskingAboutLastOrder,
};
