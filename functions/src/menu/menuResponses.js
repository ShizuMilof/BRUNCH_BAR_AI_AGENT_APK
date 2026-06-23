/* eslint-disable */

const {
  buildAction,
  buildMainActions,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

const {
  extractExactMenuMatches,
  getActiveAllergens,
} = require("./menuHelpers");

const {
  findItemsByCategory,
} = require("./categoryMatcher");

function buildRecommendedDrinksForFoodResponse(
  nickname,
  message,
  foods,
  drinks,
) {
  const matches = extractExactMenuMatches(message, foods, []);

  if (!matches.length) {
    return buildResponse(
      "reply",
      `${nickname}, napiši za koje jelo želiš preporučeno piće.`,
      [],
      buildMainActions(),
    );
  }

  const food = foods.find((f) => f.name === matches[0]);

  if (!food || !food.preporucenaPica) {
    return buildResponse(
      "reply",
      `${nickname}, za ${matches[0]} nemam navedena preporučena pića.`,
      [],
      buildMainActions(),
    );
  }

  const recommended = Object.keys(food.preporucenaPica)
    .filter((id) => food.preporucenaPica[id])
    .map((id) => {
      const drink = drinks.find((d) => String(d.id) === String(id));
      return drink ? drink.name : undefined;
    })
    .filter(Boolean);

  return buildResponse(
    "reply",
    recommended.length > 0 ?
      `${nickname}, uz ${food.name} preporučujem: ${recommended.join(" ili ")}.` :
      `${nickname}, za ${food.name} trenutno nemam dostupna preporučena pića.`,
    recommended,
    buildMainActions(),
  );
}

function buildDrinksWithAllergensResponse(nickname, drinks) {
  const result = drinks
    .map((drink) => ({
      name: drink.name,
      allergens: getActiveAllergens(drink),
    }))
    .filter((drink) => drink.allergens.length > 0);

  if (!result.length) {
    return buildResponse(
      "reply",
      `${nickname}, trenutno nijedno dostupno piće nema navedene alergene.`,
      [],
      buildMainActions(),
    );
  }

  const text = result
    .map((drink) => `${drink.name}: ${drink.allergens.join(", ")}`)
    .join("; ");

  return buildResponse(
    "reply",
    `${nickname}, pića s navedenim alergenima su: ${text}.`,
    result.map((drink) => drink.name),
    buildMainActions(),
  );
}


function buildCategoryItemsResponse(nickname, category, foods, drinks) {
  const matchedItems = findItemsByCategory(category, foods, drinks);

  if (!matchedItems.length) {
    return buildResponse(
      "category_items",
      `${nickname}, trenutno ne mogu pronaći artikle za: ${category}. Mogu ti pomoći ako napišeš npr. pizza, sendvič, desert, predjelo ili piće.`,
      [],
      buildMainActions(),
    );
  }

  const itemNames = matchedItems.map((item) => item.name);

  return buildResponse(
    "category_items",
    `${nickname}, mogu ponuditi:\n\n${itemNames.map((name) => `- ${name}`).join("\n")}`,
    itemNames,
    itemNames.slice(0, 8).map((name) =>
      buildAction(`pick_menu_item|${name}|open_menu_browser`, `Dodaj ${name}`),
    ),
  );
}


module.exports = {
  buildRecommendedDrinksForFoodResponse,
  buildDrinksWithAllergensResponse,
  buildCategoryItemsResponse
};