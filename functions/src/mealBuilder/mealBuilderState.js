const {normalizeText} = require("../utils/normalize");
function detectRequestedMealParts(message) {
  const text = normalizeText(message || "");
  const parts = [];

  if (text.includes("juha") || text.includes("juhu")) {
    parts.push("juha");
  }

  if (
    text.includes("pasta") ||
    text.includes("pastu") ||
    text.includes("paste") ||
    text.includes("pasti") ||
    text.includes("tjestenina") ||
    text.includes("tijesto")
  ) {
    parts.push("pasta");
  }

  if (
    text.includes("sok") ||
    text.includes("pice") ||
    text.includes("piće") ||
    text.includes("piti")
  ) {
    parts.push("pice");
  }

  if (
    text.includes("salata") ||
    text.includes("salatu") ||
    text.includes("salate")
  ) {
    parts.push("salata");
  }

  if (
    text.includes("desert") ||
    text.includes("deserta") ||
    text.includes("slatko") ||
    text.includes("kolac") ||
    text.includes("kolač") ||
    text.includes("sladoled")
  ) {
    parts.push("desert");
  }

  if (
    text.includes("meso") ||
    text.includes("mesno") ||
    text.includes("glavno") ||
    text.includes("glavna") ||
    text.includes("glavnih")
  ) {
    parts.push("meso");
  }

  return [...new Set(parts)];
}

function isMealBuilderPlanStart(message) {
  const text = normalizeText(message || "");
  const parts = detectRequestedMealParts(message);

  return (
    parts.length > 1 ||
    text.includes("slozi mi rucak") ||
    text.includes("slozi mi narudzbu") ||
    text.includes("htio bih") ||
    text.includes("naruci mi nesto")
  );
}

function createMealBuilderPlan(message) {
  const requested = detectRequestedMealParts(message);

  console.log("MEAL PLAN CREATED:", JSON.stringify(requested));

  return {
    requested,
    currentIndex: 0,
    selectedItems: [],
    skipped: [],
  };
}

function getLastMealBuilderPlan(history) {
  const messages = [...(history || [])].reverse();

  for (const msg of messages) {
    const metadata = msg.metadata || {};

    if (
      metadata.mealBuilderPlan &&
      Array.isArray(metadata.mealBuilderPlan.requested)
    ) {
      return metadata.mealBuilderPlan;
    }
  }

  return null;
}

function getCurrentMealPart(plan) {
  if (!plan || !Array.isArray(plan.requested)) return "";
  return plan.requested[plan.currentIndex] || "";
}

function advanceMealBuilderPlan(plan, updates = {}) {
  const currentIndex = Number(plan.currentIndex || 0);

  const next = {
    requested: plan.requested || [],
    currentIndex: updates.setIndex !== undefined ?
      updates.setIndex :
      currentIndex + 1,
    selectedItems: Array.isArray(plan.selectedItems) ? [...plan.selectedItems] : [],
    skipped: Array.isArray(plan.skipped) ? [...plan.skipped] : [],
  };

  if (updates.selectedItem) {
    next.selectedItems.push(updates.selectedItem);
  }

  if (updates.skippedPart) {
    next.skipped.push(updates.skippedPart);
  }

  return next;
}

function isMealPlanFinished(plan) {
  return !getCurrentMealPart(plan);
}

function getLastMealBuilderContext(history) {
  const messages = [...(history || [])].reverse();

  for (const msg of messages) {
    const metadata = msg.metadata || {};

    if (metadata.mealBuilderPlan) {
      const plan = metadata.mealBuilderPlan;

      return {
        plan,
        currentItem: metadata.mealBuilderCurrentItem || "",
        currentPart:
          metadata.mealBuilderCurrentPart ||
          getCurrentMealPart(plan) ||
          "",
      };
    }
  }

  return {
    plan: null,
    currentItem: "",
    currentPart: "",
  };
}

module.exports = {
  detectRequestedMealParts,
  isMealBuilderPlanStart,
  createMealBuilderPlan,
  getLastMealBuilderPlan,
  getCurrentMealPart,
  advanceMealBuilderPlan,
  isMealPlanFinished,
  getLastMealBuilderContext,
};