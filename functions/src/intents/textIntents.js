/* eslint-disable require-jsdoc */
/* eslint-disable */

const {
  normalizeText,
} = require("../utils/normalize");

function isAskingCart(message) {
  const text = normalizeText(message);

  return (
    text.includes("sto imam u kosarici") ||
    text.includes("sto ima u kosarici") ||
    text.includes("sto sam stavio u kosaricu") ||
    text.includes("sta sam stavio u kosarici") ||
    text.includes("što imam u košarici") ||
    text.includes("moja kosarica") ||
    text.includes("moja košarica") ||
    text.includes("sto sam dodao") ||
    text.includes("što sam dodao") ||
    text.includes("sta imam u kosarici") ||
    text.includes("šta imam u košarici") ||
     text.includes("sta ima u kosarici") ||
   text.includes("kosaric") ||
    text.includes("košaric") ||
    text.includes("sto sam dodao") ||
    text.includes("što sam dodao") ||
    text.includes("sta sam dodao") ||
    text.includes("šta sam dodao") ||
    text.includes("sto imam") ||
    text.includes("što imam") ||
    text.includes("sta imam") ||
    text.includes("šta imam")
  );
}



function isAskingRecommendations(message) {
  const text = normalizeText(message);
  return (
    text.includes("preporu") ||
    text.includes("predlozi") ||
    text.includes("predloži")
  );
}

function isAskingPopularItems(message) {
  const text = normalizeText(message);
  const phrases = [
    "sto se najvise narucuje",
    "što se najviše naručuje",
    "sto je popularno",
    "što je popularno",
    "najpopularnije",
    "popularna jela",
  ];

  return phrases.some((p) => text.includes(normalizeText(p)));
}


function isOrderingIntent(message) {
  const text = normalizeText(message);

  const phrases = [
    "naruci",
    "naruči",
    "dodaj",
    "ubaci",
    "dodaj u kosaricu",
    "dodaj u košaricu",
    "zelim",
    "želim",
    "uzeo bih",
    "uzela bih",
    "hocu",
    "hoću",
    "daj mi",
    "stavi mi",
    "jednu",
    "jedan",
    "jedno",
    "dva",
    "dvije",
    "tri",
    "cetiri",
    "četiri",
    "pet",
  ];
  return phrases.some((p) => text.includes(normalizeText(p)));
}


function isAskingOrderStatus(message) {
  const text = normalizeText(message);
  const phrases = [
    "status narudzbe",
    "status narudžbe",
    "gdje je moja narudzba",
    "gdje je moja narudžba",
    "dokle je moja narudzba",
    "dokle je moja narudžba",
    "provjeri status",
  ];
  return phrases.some((p) => text.includes(normalizeText(p)));
}
function isFollowUpWhichOrder(message) {
  const text = normalizeText(message);

  const phrases = [
    "koja narudzba",
    "koja narudžba",
    "koju narudzbu",
    "koju narudžbu",
    "o kojoj narudzbi",
    "o kojoj narudžbi",
    "na koju mislis",
    "na koju misliš",
    "koja tocno",
    "koja točno",
  ];

  return phrases.some((p) => text.includes(normalizeText(p)));
}

function wasLastAssistantAboutOrderStatus(history) {
  if (!Array.isArray(history)) return false;

  const lastAssistant = [...history]
      .reverse()
      .find((item) => item && item.role === "assistant" && typeof item.text === "string");

  if (!lastAssistant) return false;

  const text = normalizeText(lastAssistant.text);

  return (
    text.includes("status") ||
    text.includes("narudzba") ||
    text.includes("narudžba") ||
    text.includes("dostavljena") ||
    text.includes("zaprimljena")
  );
}



function isRepeatLastOrderCommand(message) {
  const text = normalizeText(message);
  return (
    text === normalizeText("naruci mi kao prosli put") ||
    text === normalizeText("naruči mi kao prošli put") ||
    text === normalizeText("ponovi proslu narudzbu") ||
    text === normalizeText("ponovi prošlu narudžbu")
  );
}


function isSmallTalk(message) {
  const text = normalizeText(message);

  const phrases = [
    "bok",
    "ej",
    "hej",
    "halo",
    "pozdrav",
    "dobar dan",
    "dobra vecer",
    "dobra večer",
    "sta ima",
    "šta ima",
    "kako si",
  ];

  return phrases.some((p) => text === normalizeText(p));
}


function isFinishOrderIntent(message) {
  const text = normalizeText(message);

  return (
    text.includes("zavrsi narudzbu") ||
    text.includes("završi narudžbu") ||
    text.includes("posalji narudzbu") ||
    text.includes("pošalji narudžbu") ||
    text.includes("gotovo") ||
    text.includes("to je to")
  );
}


function isConfirmYes(message) {
  const text = normalizeText(message);
  return ["da", "yes", "može", "moze"].includes(text);
}



function isAskingRecommendedDrinksForFood(message) {
  const text = normalizeText(message);
  return (
    text.includes("preporucena pica") ||
    text.includes("preporučena pića") ||
    text.includes("sto ide uz") ||
    text.includes("što ide uz") ||
    text.includes("koje pice uz") ||
    text.includes("koje piće uz")
  );
}

function isAskingOrderHistory(message) {
  const text = normalizeText(message);

  const phrases = [
    "sto sam prethodno narucivao",
    "što sam prethodno naručivao",
    "sto sam prije narucivao",
    "što sam prije naručivao",
    "koja je moja povijest narucivanja",
    "koja je moja povijest naručivanja",
    "moja povijest narucivanja",
    "moja povijest naručivanja",
    "povijest narucivanja",
    "povijest naručivanja",
    "sto sam ja prethodno narucivao",
    "što sam ja prethodno naručivao",
    "šta sam prije naručivao",
    "što sam  naručio",
  ];

  return phrases.some((phrase) => text.includes(normalizeText(phrase)));
}


module.exports = {
  isAskingCart,
  isAskingRecommendations,
  isAskingPopularItems,
  isOrderingIntent,
  isAskingOrderStatus,
  isFollowUpWhichOrder,
  wasLastAssistantAboutOrderStatus,
  isRepeatLastOrderCommand,
  isSmallTalk,
  isFinishOrderIntent,
  isConfirmYes,
  isAskingRecommendedDrinksForFood,
};