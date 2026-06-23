/* eslint-disable */

const {
  buildAction,
} = require("../responses/actions");

const {
  buildResponse,
} = require("../responses/builders");

function buildRecommendationTypeMenuResponse(nickname) {
  return buildResponse(
    "recommendation_menu",
    `${nickname}, mogu ti preporučiti jela na više načina. Odaberi kakvu preporuku želiš.`,
    [],
    [
      buildAction("recommend_favorites", "Po mojim prošlim narudžbama"),
      buildAction("recommend_popular", "Najpopularnije trenutno"),
      buildAction("recommend_new", "Nešto novo za isprobati"),
      buildAction("open_home", "Početak"),
    ],
  );
}

function buildRecommendationItemActions(items, sourceAction) {
  const actions = [];

  items.forEach((item) => {
    actions.push(
      buildAction(
        `pick_recommendation|${sourceAction}|${item}`,
        `Dodaj ${item}`,
      ),
    );
  });

  actions.push(buildAction("open_personal_recommendations", "Sve preporuke"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildRecommendationItemActionsWhenChoosingWhatIsPopular(
  items,
  sourceAction,
) {
  const actions = [];

  items.forEach((item) => {
    actions.push(
      buildAction(
        `pick_recommendation|${sourceAction}|${item}`,
        `Dodaj ${item}`,
      ),
    );
  });

  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildRecommendationResultResponse(
  type,
  nickname,
  items,
  emptyMessage,
  successMessage,
  sourceAction,
) {
  if (!items.length) {
    return buildResponse(
      "reply",
      emptyMessage,
      [],
      [
        buildAction("open_personal_recommendations", "Natrag na preporuke"),
        buildAction("open_home", "Početak"),
      ],
    );
  }

  return buildResponse(
    type,
    successMessage(items),
    items,
    buildRecommendationItemActions(items, sourceAction),
  );
}

module.exports = {
  buildRecommendationTypeMenuResponse,
  buildRecommendationItemActions,
  buildRecommendationItemActionsWhenChoosingWhatIsPopular,
  buildRecommendationResultResponse,
};