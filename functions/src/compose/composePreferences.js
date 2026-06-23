const {
  normalizeText,
} = require("../utils/normalize");

function getFoodPreferencesFromMessage(message) {
  const text = normalizeText(message);
  const preferences = {
    withoutIngredients: [],
    allergenFree: [],
    vege: false,
  };

  const ingredientRules = [
    {words: ["rajcica", "rajčica", "paradajz"], value: "rajcica"},
    {words: ["sir"], value: "sir"},
    {words: ["mlijeko"], value: "mlijeko"},
    {words: ["gljive"], value: "gljive"},
    {words: ["meso"], value: "meso"},
  ];

  ingredientRules.forEach((rule) => {
    if (
      (text.includes("bez") || text.includes("necu") || text.includes("neću")) &&
      rule.words.some((word) => text.includes(normalizeText(word)))
    ) {
      preferences.withoutIngredients.push(rule.value);
    }
  });

  if (text.includes("bez glutena")) preferences.allergenFree.push("gluten");
  if (text.includes("bez mlijeka") || text.includes("bez laktoze")) {
    preferences.allergenFree.push("mlijeko");
  }
  if (text.includes("bez oraha") || text.includes("bez orasastih")) {
    preferences.allergenFree.push("orasastiPlodovi");
  }

  if (text.includes("vege") || text.includes("vegetarij")) {
    preferences.vege = true;
    preferences.withoutIngredients.push("meso");
  }

  return preferences;
}

function itemMatchesPreferences(item, preferences) {
  const safePreferences = {
    withoutIngredients: Array.isArray(preferences && preferences.withoutIngredients) ?
      preferences.withoutIngredients :
      [],
    allergenFree: Array.isArray(preferences && preferences.allergenFree) ?
      preferences.allergenFree :
      [],
    vege: Boolean(preferences && preferences.vege),
  };

  const ingredients = Array.isArray(item && item.sastojci) ?
    item.sastojci.map((i) => normalizeText(i)) :
    [];

  const allergens = item && item.alergeni ? item.alergeni : {};

  const hasBlockedIngredient = safePreferences.withoutIngredients.some((blocked) =>
    ingredients.some((ingredient) => ingredient.includes(normalizeText(blocked))),
  );

  if (hasBlockedIngredient) return false;

  const hasBlockedAllergen = safePreferences.allergenFree.some((key) =>
    allergens[key] === true,
  );

  if (hasBlockedAllergen) return false;

  return true;
}
module.exports = {
  getFoodPreferencesFromMessage,
  itemMatchesPreferences,
};
