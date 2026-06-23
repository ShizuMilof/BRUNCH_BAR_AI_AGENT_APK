const {normalizeText} = require("../utils/normalize");

function sortByPopularity(items) {
  return [...(items || [])]
      .filter((item) => item && item.dostupno !== false)
      .sort((a, b) => (b.popularnost || 0) - (a.popularnost || 0));
}

function hasTag(item, tag) {
  const tags = item && item.tags ? item.tags : {};
  return tags[tag] === true || tags[tag] === tag;
}

function getItemsForMealPart(part, foods, drinks) {
  const normalizedPart = normalizeText(part || "");

  if (normalizedPart === "juha") {
    return sortByPopularity(foods).filter((item) =>
      normalizeText(item.category || "") === "juha" ||
      normalizeText(item.mealRole || "") === "starter" ||
      hasTag(item, "predjelo"),
    );
  }

  if (normalizedPart === "pasta") {
    return sortByPopularity(foods).filter((item) =>
      normalizeText(item.category || "") === "tijesto" ||
      normalizeText(item.category || "").includes("pasta") ||
      normalizeText(item.name || "").includes("pasta"),
    );
  }

  if (normalizedPart === "tost") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return category === "tost" || name.includes("tost");
    });
  }

  if (normalizedPart === "pice") {
    return sortByPopularity(drinks).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return (
        category.includes("sok") ||
        category.includes("sokovi") ||
        category.includes("voda") ||
        category.includes("vode") ||
        category.includes("gazirano") ||
        category.includes("bezalkohol") ||
        name.includes("cola") ||
        name.includes("coca") ||
        name.includes("kola") ||
        name.includes("sok") ||
        name.includes("cedeni") ||
        name.includes("cijedeni") ||
        name.includes("naranca") ||
        name.includes("naranča") ||
        name.includes("jana") ||
        name.includes("jamnica") ||
        name.includes("voda") ||
        name.includes("ledeni caj") ||
        name.includes("ledeni čaj") ||
        name.includes("ice tea")
      );
    });
  }

  if (normalizedPart === "kava") {
    return sortByPopularity(drinks).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return (
        category.includes("kava") ||
        name.includes("kava") ||
        name.includes("espresso") ||
        name.includes("macchiato") ||
        name.includes("cappuccino")
      );
    });
  }

  if (normalizedPart === "glavno") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const role = normalizeText(item.mealRole || "");

      return (
        role === "main" ||
        category === "glavno" ||
        category.includes("pizza") ||
        category.includes("tijesto") ||
        category.includes("pasta") ||
        category.includes("sendvic") ||
        category.includes("sendvič")
      );
    });
  }



  if (normalizedPart === "meso") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");

      return (
        category === "glavno" ||
        hasTag(item, "meso")
      );
    });
  }

  if (normalizedPart === "pizza") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return category.includes("pizza") || name.includes("pizza");
    });
  }

  if (normalizedPart === "salata") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return category.includes("salata") || name.includes("salata");
    });
  }

  if (normalizedPart === "desert") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const role = normalizeText(item.mealRole || "");
      const name = normalizeText(item.name || "");

      return (
        category.includes("desert") ||
        role === "dessert" ||
        name.includes("palacinke") ||
        name.includes("palačinke") ||
        name.includes("sladoled") ||
        name.includes("kolac") ||
        name.includes("kolač")
      );
    });
  }

  if (normalizedPart === "sendvic") {
    return sortByPopularity(foods).filter((item) => {
      const category = normalizeText(item.category || "");
      const name = normalizeText(item.name || "");

      return (
        category.includes("sendvic") ||
        category.includes("sendvič") ||
        name.includes("sendvic") ||
        name.includes("sendvič")
      );
    });
  }

  return [];
}

function getMealPartLabel(part) {
  const labels = {
    juha: "juhu",
    pasta: "paštu/tjesteninu",
    pice: "sok/piće",
    kava: "kavu",
    meso: "mesno/glavno jelo",
    pizza: "pizzu",
    salata: "salatu",
    desert: "desert",
    sendvic: "sendvič",
    tost: "tost",
  };

  return labels[part] || part;
}


function buildMealPartQuestion({nickname, part, foods, drinks, plan, buildResponse}) {
  const items = getItemsForMealPart(part, foods, drinks);

  if (!items.length) {
    const nextPlan = {
      ...plan,
      currentIndex: Number(plan.currentIndex || 0) + 1,
      skipped: [...(plan.skipped || []), part],
    };

    return buildResponse(
        "meal_builder_step",
        `${nickname}, trenutno nemam ništa za ${getMealPartLabel(part)}. Idemo dalje.`,
        [],
        [],
        {
          mealBuilderPlan: nextPlan,
        },
    );
  }

  if (items.length === 1) {
    const item = items[0];

    return buildResponse(
        "meal_builder_step",
        `${nickname}, od ${getMealPartLabel(part)} imam ${item.name}. Želiš li to dodati?`,
        [],
        [],
        {
          mealBuilderPlan: plan,
          lastSuggestedItems: [item.name],
          mealBuilderCurrentItem: item.name,
          mealBuilderCurrentPart: part,
        },
    );
  }

  const offered = items.slice(0, 5).map((item) => item.name);

  return buildResponse(
      "meal_builder_step",
      `${nickname}, od ${getMealPartLabel(part)} mogu ponuditi:\n\n${offered
          .map((name) => `- ${name}`)
          .join("\n")}\n\nKoju želiš?`,
      [],
      [],
      {
        mealBuilderPlan: plan,
        lastSuggestedItems: offered,
        mealBuilderCurrentPart: part,
      },
  );
}

module.exports = {
  getItemsForMealPart,
  buildMealPartQuestion,
};