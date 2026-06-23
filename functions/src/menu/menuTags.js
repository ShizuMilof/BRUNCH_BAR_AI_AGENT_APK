const {normalizeText} = require("../utils/normalize");

function hasTag(item, tag) {
  const tags = item?.tags || {};

  if (Array.isArray(tags)) {
    return tags.includes(tag);
  }

  return (
    tags[tag] === true ||
    normalizeText(tags[tag] || "") === normalizeText(tag)
  );
}

function getMealRole(item) {
  return normalizeText(item?.mealRole || "");
}

module.exports = {
  hasTag,
  getMealRole,
};