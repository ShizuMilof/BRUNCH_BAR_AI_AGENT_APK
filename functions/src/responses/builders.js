/* eslint-disable require-jsdoc */
/* eslint-disable max-len */

function buildResponse(
    type,
    message,
    items = [],
    actions = [],
    metadata = {},
) {
  return {
    type,
    message,
    items,
    actions,
    metadata,
  };
}

function buildHomeResponse(nickname) {
  return buildResponse(
      "home",
      `${nickname}, bok. Napiši što želiš naručiti, pitaj što je popularno ili zatraži svoje prethodne narudžbe.`,
      [],
      [],
  );
}

module.exports = {
  buildResponse,
  buildHomeResponse,
};
