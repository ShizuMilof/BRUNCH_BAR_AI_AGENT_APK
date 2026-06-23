const {
  normalizeText,
} = require("../utils/normalize");


function isAskingDrinksWithAllergens(message) {
  const text = normalizeText(message);

  return (
    text.includes("koja pica imaju alergene") ||
    text.includes("koja pića imaju alergene") ||
    text.includes("pica s alergenima") ||
    text.includes("pića s alergenima") ||
    text.includes("koje pice imaju alergene") ||
    text.includes("koje piće ima alergene")
  );
}


module.exports = {
  isAskingDrinksWithAllergens,
};
