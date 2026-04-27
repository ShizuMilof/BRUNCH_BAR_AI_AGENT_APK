/* eslint-disable max-len */

const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

function normalizeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
}
function buildOrderStatusResponse(nickname, activeOrder) {
  return buildResponse(
    "order_status",
    activeOrder ?
      `${nickname}, status tvoje zadnje aktivne narudžbe je: ${activeOrder.status || "Nepoznat status"}.` :
      `${nickname}, trenutačno nemaš aktivnu narudžbu.`,
    [],
activeOrder ? [buildAction(`refresh_order_status|${activeOrder.key || activeOrder.id || ""}`, "Osvježi status")] : []  );
}

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

function getActiveAllergens(item) {
  const alergeni = item?.alergeni || {};

  return Object.entries(alergeni)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
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
      buildMainActions()
    );
  }

  const text = result
    .map((drink) => `${drink.name}: ${drink.allergens.join(", ")}`)
    .join("; ");

  return buildResponse(
    "reply",
    `${nickname}, pića s navedenim alergenima su: ${text}.`,
    result.map((drink) => drink.name),
    buildMainActions()
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

  return phrases.some((p) => text === normalizeText(p) || text.includes(normalizeText(p)));
}

function formatOrderItemsShort(order, maxItems = 1) {
  const items = getOrderItems(order).map((item) => {
    const base = extractBaseItemName(item)
      .split("\n")[0]
      .replace(/MODIFIKACIJE:.*/i, "")
      .replace(/NAPOMENA:.*/i, "")
      .trim();

    return base;
  });

  if (items.length === 0) return "Bez stavki";

  let text = items.slice(0, maxItems).join(", ");

  if (items.length > maxItems) {
    text += ` +${items.length - maxItems}`;
  }

  const maxLength = 22;

  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text;
}

function buildOrderSelectionResponse(nickname, orders) {
  if (!orders.length) {
    return buildResponse(
      "reply",
      `${nickname}, trenutačno nemaš aktivnu narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ]
    );
  }

  if (orders.length === 1) {
    return buildSingleOrderStatusResponse(nickname, orders[0]);
  }

  const orderActions = orders.slice(0, 8).map((order, index) => {
    const label = `Narudžba ${index + 1}: ${formatOrderItemsShort(order)}`;
    return buildAction(`select_order_status|${order.key || order.id || index}`, label);
  });

  return buildResponse(
    "order_selection",
    `${nickname}, imaš više aktivnih narudžbi. Odaberi za koju želiš provjeriti status.`,
    [],
    [
      ...orderActions,
      buildAction("open_home", "Početak"),
    ]
  );
}

function buildSingleOrderStatusResponse(nickname, order) {
  if (!order) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći odabranu narudžbu.`,
      [],
      [
        buildAction("open_order_status", "Natrag"),
        buildAction("open_home", "Početak"),
      ]
    );
  }

  const items = getOrderItems(order);
  const status = order.status || "Nepoznat status";
  const orderKey = order.key || order.id || "";

  return buildResponse(
    "order_status",
    `${nickname}, status odabrane narudžbe je: ${status}. Stavke: ${items.join(", ")}.`,
    [],
    [
      buildAction(`refresh_order_status|${orderKey}`, "Osvježi status"),
      buildAction("open_order_status", "Natrag"),
      buildAction("open_home", "Početak"),
    ]
  );
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function filterAvailable(items) {
  return items.filter((item) => item && item.dostupno !== false);
}

function buildCategoryRecommendations(userOrders, foods, drinks, limit = 3) {
  const menu = [...foods, ...drinks];

  const deliveredOrders = userOrders.filter((order) =>
    normalizeText(order?.status || "") === normalizeText("Dostavljeno")
  );

  const categories = new Map();

  deliveredOrders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const base = extractBaseItemName(item);

      const found = menu.find((m) => m.name === base);
      if (!found) return;

      const cat = found.category || "ostalo";

      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
  });

  // sortiraj kategorije po učestalosti
  const sortedCats = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const result = [];

  sortedCats.forEach((cat) => {
    menu.forEach((item) => {
      if (
        item.category === cat &&
        !result.includes(item.name)
      ) {
        result.push(item.name);
      }
    });
  });

  return result.slice(0, limit);
}

function sortByName(items) {
  return [...items].sort((a, b) => {
    const nameA = (a?.name || "").toString().toLowerCase();
    const nameB = (b?.name || "").toString().toLowerCase();
    return nameA.localeCompare(nameB, "hr");
  });
}

function sortOrdersByCreatedAtDesc(orders) {
  return [...orders].sort((a, b) => {
    const aTime = Number(a?.createdAt || 0);
    const bTime = Number(b?.createdAt || 0);
    return bTime - aTime;
  });
}

function getOrderItems(order) {
  if (!order || !Array.isArray(order.stavke)) return [];
  return order.stavke.filter((item) => typeof item === "string" && item.trim());
}

function extractBaseItemName(orderItem) {
  if (!orderItem || typeof orderItem !== "string") return "";

  const quantityIndex = orderItem.toUpperCase().lastIndexOf("(X");
  return quantityIndex !== -1 ?
    orderItem.substring(0, quantityIndex).trim() :
    orderItem.trim();
}

function centToEur(cents) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

function buildMenuContext(foods, drinks) {
  return {
    hrana: foods.map((f) => ({
      naziv: f.name ?? "",
      kategorija: f.category ?? "",
      cijenaCent: f.cijenaCent ?? null,
      cijenaEur: centToEur(f.cijenaCent),
      opis: f.opis ?? "",
      dostupno: f.dostupno !== false,
      alergeni: f.alergeni || {},
      oznake: {
        ljuto: f.oznake?.ljuto === true,
        vegansko: f.oznake?.vegansko === true,
        vegetarijansko: f.oznake?.vegetarijansko === true,
      },
preporucenaPica: mapRecommendedDrinks(f.preporucenaPica, drinks),    })),
    pica: drinks.map((d) => ({
      naziv: d.name ?? "",
      kategorija: d.category ?? "",
      cijenaCent: d.cijenaCent ?? null,
      cijenaEur: centToEur(d.cijenaCent),
      opis: d.opis ?? "",
      dostupno: d.dostupno !== false,
      alergeni: d.alergeni || {},
      oznake: {
        ljuto: d.oznake?.ljuto === true,
        vegansko: d.oznake?.vegansko === true,
        vegetarijansko: d.oznake?.vegetarijansko === true,
      },
    })),
  };
}
function formatContextJson(foods, drinks) {
  return JSON.stringify(buildMenuContext(foods, drinks), null, 2);
}

function buildOrdersContext(activeOrder, lastDeliveredOrder) {
  return JSON.stringify(
    {
      trenutnaNarudzba: activeOrder || null,
      proslaNarudzba: lastDeliveredOrder || null,
    },
    null,
    2
  );
}

function extractGeminiText(data) {
  const candidates = data?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "Nema odgovora od modela.";
  }

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return "Nema odgovora od modela.";
  }

  const text = parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  return text || "Nema odgovora od modela.";
}

function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "Nema.";
  }

  return history.slice(-4)
    .filter((item) => item && typeof item.text === "string")
    .map((item) => {
      const role = item.role === "assistant" ? "AI" : "Korisnik";
      return `${role}: ${item.text}`;
    })
    .join("\n");
}

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

function isRepeatLastOrderCommand(message) {
  const text = normalizeText(message);
  return (
    text === normalizeText("naruci mi kao prosli put") ||
    text === normalizeText("naruči mi kao prošli put") ||
    text === normalizeText("ponovi proslu narudzbu") ||
    text === normalizeText("ponovi prošlu narudžbu")
  );
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
  ];

  return phrases.some((p) => text.includes(normalizeText(p)));
}

function buildMenuNameSet(foods, drinks) {
  const names = [...foods, ...drinks]
    .map((item) => (item?.name || "").trim())
    .filter(Boolean);

  return new Set(names);
}

function buildAllMenuNames(foods, drinks) {
  return [...foods, ...drinks]
    .map((item) => (item?.name || "").trim())
    .filter(Boolean);
}

function extractExactMenuMatches(message, foods, drinks) {
  const text = normalizeText(message);
  const menuNames = buildAllMenuNames(foods, drinks);

  return menuNames.filter((name) => {
    const normalizedName = normalizeText(name);
    return normalizedName && text.includes(normalizedName);
  });
}

function buildStrictOrderingHelpResponse(nickname) {
  return buildResponse(
    "reply",
    `${nickname}, za dodavanje artikala u narudžbu koristi pregled jelovnika i ponuđene gumbe. U chatu ti mogu pomoći s informacijama o jelovniku, alergenima, cijenama i preporukama.`,
    [],
    buildMainActions()
  );
}

function countTopOrderedItems(orders, limit = 3) {
  const counts = new Map();

  orders.forEach((order) => {
    getOrderItems(order).forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);
      if (!baseName) return;

      const quantityMatch = rawItem.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      const current = counts.get(baseName) || 0;

      counts.set(baseName, current + quantity);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function buildPopularItems(allOrders, foods, drinks, limit = 3) {
  const availableNames = buildMenuNameSet(foods, drinks);

  const deliveredOrders = allOrders.filter((order) =>
    normalizeText(order?.status || "") === normalizeText("Dostavljeno")
  );

  return countTopOrderedItems(deliveredOrders, 20)
    .filter((name) => availableNames.has(name))
    .slice(0, limit);
}

function buildPersonalRecommendations(userOrders, foods, drinks, limit = 3) {
  const availableNames = buildMenuNameSet(foods, drinks);

  const deliveredOrders = userOrders.filter((order) =>
    normalizeText(order?.status || "") === normalizeText("Dostavljeno")
  );

  return countTopOrderedItems(deliveredOrders, 20)
    .filter((name) => availableNames.has(name))
    .slice(0, limit);
}

function buildFavoritesRecommendations(userOrders, foods, drinks, limit = 3) {
  return buildPersonalRecommendations(userOrders, foods, drinks, limit);
}

function buildSimilarRecommendations(userOrders, foods, drinks, limit = 3) {
  const favorites = buildPersonalRecommendations(userOrders, foods, drinks, 10);
  const favoriteSet = new Set(favorites);

  const categoryItems = buildCategoryRecommendations(userOrders, foods, drinks, 20);

  return categoryItems
    .filter((item) => !favoriteSet.has(item))
    .slice(0, limit);
}



function buildNewRecommendations(userOrders, foods, drinks, limit = 3) {
  const deliveredOrders = userOrders.filter((order) =>
    normalizeText(order?.status || "") === normalizeText("Dostavljeno")
  );

  const alreadyOrdered = new Set(
    deliveredOrders.flatMap((order) =>
      getOrderItems(order).map((item) => extractBaseItemName(item))
    )
  );

  const allMenuItems = [...foods, ...drinks]
    .map((item) => item?.name)
    .filter(Boolean);

  const categoryItems = buildCategoryRecommendations(userOrders, foods, drinks, 50);

  const newFromFavoriteCategories = categoryItems
    .filter((item) => !alreadyOrdered.has(item));

  if (newFromFavoriteCategories.length > 0) {
    return newFromFavoriteCategories.slice(0, limit);
  }

  const anyNewItems = allMenuItems.filter((item) => !alreadyOrdered.has(item));

  return anyNewItems.slice(0, limit);
}

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
    ]
  );
}

function buildRecommendationItemActions(items, sourceAction) {
  const actions = [];

  items.forEach((item) => {
    actions.push(
      buildAction(
        `pick_recommendation|${sourceAction}|${item}`,
        `Dodaj ${item}`
      )
    );
  });

  actions.push(buildAction("open_personal_recommendations", "Sve preporuke"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildRecommendationItemActionsWhenChoosingWhatIsPopular(items, sourceAction) {
  const actions = [];

  items.forEach((item) => {
    actions.push(
      buildAction(
        `pick_recommendation|${sourceAction}|${item}`,
        `Dodaj ${item}`
      )
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
  sourceAction
) {
  if (!items.length) {
    return buildResponse(
      "reply",
      emptyMessage,
      [],
      [
        buildAction("open_personal_recommendations", "Natrag na preporuke"),
        buildAction("open_home", "Početak"),
      ]
    );
  }

  return buildResponse(
    type,
    successMessage(items),
    items,
    buildRecommendationItemActions(items, sourceAction)
  );
}

function buildAction(id, label) {
  return {id, label};
}
function buildMainActions() {
  return [
    buildAction("open_new_order", "Nova narudžba"),
    buildAction("open_order_status", "Status narudžbe"),
    buildAction("open_last_delivered_order", "Zadnja dostavljena narudžba"),
    buildAction("open_last_any_order", "Zadnja narudžba"),
    buildAction("open_personal_recommendations", "Preporuči mi nešto"),
    buildAction("open_popular_items", "Što je popularno?"),
    buildAction("open_home", "Početak"),
  ];
}

function buildDefaultInfoActions() {
   return buildMainActions();

}
function buildResponse(type, message, items = [], actions = []) {
  return {
    type,
    message,
    items,
    actions,
  };
}

function buildHomeResponse(nickname) {
  return buildResponse(
    "home",
    `Dobar dan, ${nickname}. Ja sam vaš AI konobar i mogu vam pomoći s jelovnikom, cijenama, alergenima, preporukama, popularnim jelima, statusom narudžbe i prošlim narudžbama. Za dodavanje artikala koristite ponuđene gumbe.`,
    [],
       buildMainActions()
  );
}
function mapRecommendedDrinks(preporucenaPica, drinks) {
  if (!preporucenaPica) return [];

  const ids = Object.keys(preporucenaPica)
    .filter((key) => preporucenaPica[key]);

  return ids
    .map((id) => {
      const drink = drinks.find((d) => String(d.id) === String(id));
      return drink?.name;
    })
    .filter(Boolean);
}


function buildLastAnyOrderResponse(nickname, order) {
  if (!order) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ]
    );
  }

  const items = getOrderItems(order);
  const status = order.status || "Nepoznat status";

  return buildResponse(
    "last_any_order_actions",
    items.length > 0 ?
      `${nickname}, tvoja zadnja narudžba je: ${items.join(", ")}. Status: ${status}.` :
      `${nickname}, pronašao sam tvoju zadnju narudžbu, ali nema stavki za prikaz. Status: ${status}.`,
    items,
    [
      buildAction("repeat_last_any_order_submit", "Naruči ponovno"),
      buildAction("repeat_last_any_order_to_cart", "Prilagodi narudžbu"),
      buildAction("open_home", "Početak"),
    ]
  );
}

function buildLastDeliveredOrderResponse(nickname, items) {
  if (!items.length) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
      [],
      [
        buildAction("open_home", "Početak"),
      ]
    );
  }

  return buildResponse(
    "last_delivered_order_actions",
    `${nickname}, ovo je tvoja zadnja dostavljena narudžba: ${items.join(", ")}.`,
    items,
    [
      buildAction("repeat_last_order_submit", "Naruči ponovno"),
      buildAction("repeat_last_order_to_cart", "Prilagodi narudžbu"),
      buildAction("open_home", "Početak"),
    ]
  );
}
function buildMenuCategoryActions(items, type) {
  const categories = [...new Set(
    items
      .map((item) => (item?.category || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "hr"));

  const actions = categories.map((cat) =>
    buildAction(`menu_${type}_category|${cat}`, cat)
  );

  actions.push(buildAction("open_menu_browser", "Natrag na jelovnik"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildMenuItemActions(items, backAction) {
  const actions = items.slice(0, 10).map((item) =>
    buildAction(`pick_menu_item|${item.name}|${backAction}`, item.name)
  );

  actions.push(buildAction(backAction, "Natrag"));
  actions.push(buildAction("open_home", "Početak"));

  return actions;
}

function buildMenuItemConfirmResponse(nickname, itemName, backAction) {
  return buildResponse(
    "menu_item_add",
    `${nickname}, želiš li dodati ${itemName} u narudžbu?`,
    [`${itemName}(X1)`],
    [
      buildAction(`confirm_menu_item_add|${itemName}|${backAction}`, "Dodaj"),
      buildAction(backAction, "Natrag"),
      buildAction("open_home", "Početak"),
    ]
  );
}



async function callGemini({
  apiKey,
  message,
  contextJson,
  ordersContextJson,
  nickname,
  historyText,
}) {
  const model = "gemini-2.5-flash-lite";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    encodeURIComponent(apiKey);

const prompt = `
Ti si pametni konobar za restoran.

PRAVILA:
- Odgovaraj na hrvatskom jeziku.
- Korisniku se obraćaj imenom: ${nickname}.
- Koristi ISKLJUČIVO podatke iz konteksta.
- Ne izmišljaj artikle, cijene, alergene, sastojke ni preporuke.
- Ako podatak ne postoji u kontekstu, reci da ga nemaš.
- Odgovor neka bude kratak i praktičan, najviše 3 kratke rečenice.
- Chat služi samo za informiranje o jelovniku, alergenima, oznakama, cijenama, kategorijama, opisima artikala, preporukama, preporučenim pićima i statusu narudžbe.
- Chat ne smije dodavati artikle u košaricu.
- Chat ne smije slati narudžbu.
- Chat ne smije tvrditi da je nešto dodano, poslano ili naručeno.
- Ako korisnik želi naručiti, dodati artikl, poslati narudžbu ili mijenjati košaricu, uputi ga da koristi ponuđene gumbe i pregled jelovnika.
- Ako korisnik pita za gluten, laktozu, orašaste plodove ili drugi alergen, provjeri samo polje alergeni.
- Ako podatak o alergenu ne postoji, reci da nemaš taj podatak.
- Ako korisnik pita što je vegansko, vegetarijansko ili ljuto, koristi polje oznake.
- Ako korisnik pita što se preporučuje uz jelo, koristi polje preporucenaPica.
- Kada navodiš preporučena pića, koristi njihove nazive, ne brojeve.
- Ako korisnik pita što ima u nekoj kategoriji, navedi artikle iz te kategorije.
- Prethodni razgovor koristi samo za razumijevanje pitanja, ali nikad nemoj iz njega predlagati dodavanje artikala.
- Ako trenutna poruka korisnika nije jasno pitanje o jelovniku, alergenima, cijeni, preporukama ili statusu, odgovori da možeš pomoći oko jelovnika i narudžbe preko gumba.
- Ako korisnik pita za status narudžbe ili postavi dodatno pitanje o tome "koja narudžba", ne pokušavaj sam zaključiti. Reci da status provjerava sustav kroz ponuđene gumbe.
- Ako korisnik pita koja hrana ili pića imaju alergene, provjeri sve artikle i navedi samo one kod kojih je barem jedan alergen označen s true.
- Ako nijedan artikl nema alergen označen s true, reci da trenutno nema artikala s navedenim alergenima.


PRETHODNI RAZGOVOR:
${historyText}

KONTEKST MENIJA:
${contextJson}

KONTEKST NARUDŽBI:
${ordersContextJson}

KORISNIK:
${message}
`.trim();

  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      contents: [{role: "user", parts: [{text: prompt}]}],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300,
      },
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  return extractGeminiText(data);
}

exports.chatWaiter = onCall(
  {
    region: "europe-west1",
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    try {
      const message = (request.data?.message || "").trim();
      const action = (request.data?.action || "").trim();
      const userId = (request.data?.userId || "").trim();
      const nickname = (request.data?.nickname || "Gost").trim();
      const history = Array.isArray(request.data?.history) ? request.data.history : [];
      const historyText = formatHistory(history);

      if (!message && !action) {
        throw new HttpsError("invalid-argument", "Poruka ili akcija su obavezni.");
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "Nedostaje GEMINI_API_KEY secret.");
      }

      const root = admin.database().ref();

      const [picaSnap, hranaSnap, narudzbeSnap] = await Promise.all([
        root.child("pica").get(),
        root.child("hrana").get(),
        root.child("narudzbe").get(),
      ]);

      const drinks = sortByName(filterAvailable(normalizeArray(picaSnap.val())));
      const foods = sortByName(filterAvailable(normalizeArray(hranaSnap.val())));
const rawOrders = narudzbeSnap.val() || {};
const allOrders = Object.entries(rawOrders)
  .map(([key, value]) => ({key, ...value}))
  .filter(Boolean);
      const userOrders = userId ?
        allOrders.filter((order) => order && order.userId === userId) :
        [];

      const activeOrders = sortOrdersByCreatedAtDesc(
        userOrders.filter((order) => {
          const status = normalizeText(order?.status || "");
          return status !== normalizeText("Dostavljeno") &&
            status !== normalizeText("Otkazano");
        })
      );

     const activeOrder = activeOrders[0] || null;

     // --- ZADNJA DOSTAVLJENA ---
     const completedOrders = sortOrdersByCreatedAtDesc(
       userOrders.filter((order) =>
         normalizeText(order?.status || "") === normalizeText("Dostavljeno")
       )
     );

     const lastDeliveredOrder = completedOrders[0] || null;
     const lastDeliveredOrderItems = getOrderItems(lastDeliveredOrder);
          const allUserOrdersSorted = sortOrdersByCreatedAtDesc(userOrders);
     const lastAnyOrder = allUserOrdersSorted[0] || null;
     const lastAnyOrderItems = getOrderItems(lastAnyOrder);


if (action === "open_home") {
  return buildHomeResponse(nickname);
}

if (action === "open_last_delivered_order") {
  return buildLastDeliveredOrderResponse(nickname, lastDeliveredOrderItems);
}

if (action === "open_last_any_order") {
  return buildLastAnyOrderResponse(nickname, lastAnyOrder);
}

if (action === "repeat_last_order_submit") {
  return buildResponse(
    "repeat_last_order_submit",
    lastDeliveredOrderItems.length > 0 ?
      `${nickname}, želiš li odmah poslati ovu narudžbu u kuhinju: ${lastDeliveredOrderItems.join(", ")}?` :
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
    lastDeliveredOrderItems,
    []
  );
}

if (action === "repeat_last_order_to_cart") {
  return buildResponse(
    "repeat_last_order_to_cart",
    lastDeliveredOrderItems.length > 0 ?
      `${nickname}, mogu prebaciti tvoju zadnju dostavljenu narudžbu u košaricu za prilagodbu: ${lastDeliveredOrderItems.join(", ")}. Želiš li to?` :
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
    lastDeliveredOrderItems,
    []
  );
}

if (action === "repeat_last_any_order_submit") {
  return buildResponse(
    "repeat_last_any_order_submit",
    lastAnyOrderItems.length > 0 ?
      `${nickname}, želiš li odmah poslati ovu narudžbu u kuhinju: ${lastAnyOrderItems.join(", ")}?` :
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
    lastAnyOrderItems,
    []
  );
}

if (action === "repeat_last_any_order_to_cart") {
  return buildResponse(
    "repeat_last_any_order_to_cart",
    lastAnyOrderItems.length > 0 ?
      `${nickname}, mogu prebaciti tvoju zadnju narudžbu u košaricu za prilagodbu: ${lastAnyOrderItems.join(", ")}. Želiš li to?` :
      `${nickname}, ne mogu pronaći tvoju zadnju narudžbu.`,
    lastAnyOrderItems,
    []
  );
}

if (action === "open_personal_recommendations") {
  return buildRecommendationTypeMenuResponse(nickname);
}

   if (action === "recommend_favorites") {
     const items = buildFavoritesRecommendations(userOrders, foods, drinks, 3);

     return buildRecommendationResultResponse(
       "personal_recommendations",
       nickname,
       items,
       `${nickname}, još nemam dovoljno tvojih prošlih dostavljenih narudžbi za ovu vrstu preporuke.`,
       (resultItems) =>
         resultItems.length === 1 ?
           `${nickname}, preporučujem: ${resultItems[0]}. Ovu preporuku temeljim na tvojim prošlim dostavljenim narudžbama i artiklima koje si najčešće birao.` :
           `${nickname}, na temelju tvojih prošlih dostavljenih narudžbi preporučujem: ${resultItems.join(", ")}. To su artikli koje si najčešće birao.`,
       "recommend_favorites"
     );
   }

if (action === "recommend_popular") {
  const items = buildPopularItems(allOrders, foods, drinks, 3);

  return buildRecommendationResultResponse(
    "popular_items",
    nickname,
    items,
    `${nickname}, trenutačno nemam dovoljno podataka o popularnim artiklima.`,
    (resultItems) =>
      `${nickname}, trenutno su najpopularniji artikli: ${resultItems.join(", ")}. To su artikli koji se najčešće naručuju među svim gostima.`,
    "recommend_popular"
  );
}

if (action === "recommend_new") {
  const items = buildNewRecommendations(userOrders, foods, drinks, 3);

  return buildRecommendationResultResponse(
    "personal_recommendations",
    nickname,
    items,
    `${nickname}, još nemam dovoljno tvojih prošlih dostavljenih narudžbi da preporučim nešto novo baš prema tvom ukusu.`,
    (resultItems) =>
      resultItems.length === 1 ?
        `${nickname}, za isprobati nešto novo preporučujem: ${resultItems[0]}.` :
        `${nickname}, ako želiš isprobati nešto novo, preporučujem: ${resultItems.join(", ")}.`,
    "recommend_new"
  );
}


if (action.startsWith("pick_recommendation|")) {
  const parts = action.split("|");
  const sourceAction = parts[1];
  const selectedItem = parts[2];

  const availableNames = buildMenuNameSet(foods, drinks);

  if (!sourceAction || !selectedItem || !availableNames.has(selectedItem)) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći odabranu preporuku.`,
      [],
      [buildAction("open_home", "Početak")]
    );
  }

  return buildResponse(
    "recommendation_pick_confirm",
    `${nickname}, želiš li da dodam ${selectedItem} u tvoju narudžbu?`,
    [`${selectedItem}(X1)`],
    [
      buildAction(`confirm_recommendation_add|${selectedItem}|${sourceAction}`, "Da"),
      buildAction(sourceAction, "Odaberi nešto drugo"),
    ]
  );
}

if (action.startsWith("confirm_recommendation_add|")) {
  const parts = action.split("|");
  const selectedItem = parts[1];
  const sourceAction = parts[2] || "open_personal_recommendations";

  const availableNames = buildMenuNameSet(foods, drinks);

  if (!selectedItem || !availableNames.has(selectedItem)) {
    return buildResponse(
      "reply",
      `${nickname}, ne mogu pronaći odabrani artikl.`,
      [],
      [buildAction("open_home", "Početak")]
    );
  }

  return buildResponse(
    "recommendation_added",
`${nickname}, dodali ste ${selectedItem} u svoju narudžbu. U pregledu narudžbe možete pritisnuti artikl za napomene i modifikacije.`,    [`${selectedItem}(X1)`],
    [
      buildAction(sourceAction, "Još ovakvih preporuka"),
      buildAction("go_to_cart", "Završi narudžbu"),
      buildAction("open_home", "Početak"),
    ]
  );
}



   if (action === "open_order_status") {
     return buildOrderSelectionResponse(nickname, activeOrders);
   }

    if (action.startsWith("refresh_order_status")) {
      const selectedKey = action.includes("|") ? action.split("|")[1] : null;

      if (selectedKey) {
        const selectedOrder = userOrders.find((order) => order.key === selectedKey);
        return buildSingleOrderStatusResponse(nickname, selectedOrder);
      }

      if (activeOrder) {
        return buildSingleOrderStatusResponse(nickname, activeOrder);
      }

      const userOrdersSorted = sortOrdersByCreatedAtDesc(userOrders);
      return buildOrderSelectionResponse(nickname, userOrdersSorted);
    }

if (action.startsWith("select_order_status|")) {
  const selectedKey = action.split("|")[1];

  const selectedOrder = userOrders.find((order) => order.key === selectedKey);

  return buildSingleOrderStatusResponse(nickname, selectedOrder);
}

     if (action === "open_popular_items") {
       const items = buildPopularItems(allOrders, foods, drinks, 3);

       return buildResponse(
         "popular_items",
         items.length > 0 ?
           `${nickname}, trenutno su najpopularniji artikli: ${items.join(", ")}.` :
           `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
         items,
        items.length > 0 ? buildRecommendationItemActionsWhenChoosingWhatIsPopular(items, "recommend_popular") : [buildAction("open_home", "Početak")]
       );
     }
if (action === "open_new_order") {
  return buildResponse(
    "new_order",
    `${nickname}, kako želiš započeti novu narudžbu?`,
    [],
    [
      buildAction("open_menu_browser", "Pregled jelovnika"),
      buildAction("open_popular_items", "Što je popularno?"),
      buildAction("open_home", "Početak"),
    ]
  );
}

   if (action === "open_menu_browser") {
     return buildResponse(
       "menu_browser_root",
       `${nickname}, odaberi što želiš pregledati.`,
       [],
       [
         buildAction("menu_food_root", "Hrana"),
         buildAction("menu_drink_root", "Piće"),
         buildAction("open_new_order", "Natrag"),
         buildAction("open_home", "Početak"),
       ]
     );
   }

   if (action === "menu_food_root") {
     return buildResponse(
       "menu_categories",
       `${nickname}, odaberi kategoriju hrane.`,
       [],
       buildMenuCategoryActions(foods, "food")
     );
   }

   if (action === "menu_drink_root") {
     return buildResponse(
       "menu_categories",
       `${nickname}, odaberi kategoriju pića.`,
       [],
       buildMenuCategoryActions(drinks, "drink")
     );
   }

   if (action.startsWith("menu_food_category|")) {
     const category = action.split("|")[1];

     const items = foods.filter((item) => item?.category === category);
     const backAction = "menu_food_root";

     return buildResponse(
       "menu_items",
       `${nickname}, odaberi artikl iz kategorije ${category}.`,
       [],
       buildMenuItemActions(items, backAction)
     );
   }

   if (action.startsWith("menu_drink_category|")) {
     const category = action.split("|")[1];

     const items = drinks.filter((item) => item?.category === category);
     const backAction = "menu_drink_root";

     return buildResponse(
       "menu_items",
       `${nickname}, odaberi artikl iz kategorije ${category}.`,
       [],
       buildMenuItemActions(items, backAction)
     );
   }

   if (action.startsWith("pick_menu_item|")) {
     const parts = action.split("|");
     const itemName = parts[1];
     const backAction = parts[2] || "open_menu_browser";

     const availableNames = buildMenuNameSet(foods, drinks);

     if (!itemName || !availableNames.has(itemName)) {
       return buildResponse(
         "reply",
         `${nickname}, ne mogu pronaći odabrani artikl.`,
         [],
         [
           buildAction("open_menu_browser", "Pregled jelovnika"),
           buildAction("open_home", "Početak"),
         ]
       );
     }

     return buildMenuItemConfirmResponse(nickname, itemName, backAction);
   }

   if (action.startsWith("confirm_menu_item_add|")) {
     const parts = action.split("|");
     const itemName = parts[1];
     const backAction = parts[2] || "open_menu_browser";

     const availableNames = buildMenuNameSet(foods, drinks);

     if (!itemName || !availableNames.has(itemName)) {
       return buildResponse(
         "reply",
         `${nickname}, ne mogu pronaći odabrani artikl.`,
         [],
         [
           buildAction("open_menu_browser", "Pregled jelovnika"),
           buildAction("open_home", "Početak"),
         ]
       );
     }

     return buildResponse(
       "menu_item_added",
       `${nickname}, dodao sam ${itemName} u tvoju narudžbu. U pregledu narudžbe možeš pritisnuti artikl za napomene i modifikacije. Želiš li još nešto?`,
       [`${itemName}(X1)`],
       [
         buildAction(backAction, "Dodaj još iz ove kategorije"),
         buildAction("open_menu_browser", "Pregled jelovnika"),
         buildAction("go_to_cart", "Završi narudžbu"),
         buildAction("open_home", "Početak"),
       ]
     );
   }


   if (isAskingAboutLastOrder(message)) {
     return buildLastDeliveredOrderResponse(nickname, lastDeliveredOrderItems);
   }
if (isRepeatLastOrderCommand(message)) {
  return buildResponse(
    "repeat_last_order",
    lastDeliveredOrderItems.length > 0 ?
      `${nickname}, mogu ponovno dodati tvoju zadnju dostavljenu narudžbu: ${lastDeliveredOrderItems.join(", ")}. Potvrdi s 'da'.` :
      `${nickname}, ne mogu pronaći tvoju zadnju dostavljenu narudžbu.`,
    lastDeliveredOrderItems,
    []
  );
}

if (isAskingOrderStatus(message)) {
  if (activeOrders.length > 0) {
    return buildOrderSelectionResponse(nickname, activeOrders);
  }

  if (lastAnyOrder) {
    return buildResponse(
      "last_any_order_actions",
      `${nickname}, trenutno nemaš aktivnu narudžbu. Tvoja zadnja narudžba je: ${getOrderItems(lastAnyOrder).join(", ")}. Status: ${lastAnyOrder.status || "Nepoznat status"}.`,
      getOrderItems(lastAnyOrder),
      [
        buildAction("open_order_status", "Provjeri aktivne narudžbe"),
        buildAction("open_last_any_order", "Prikaži zadnju narudžbu"),
        buildAction("open_home", "Početak"),
      ]
    );
  }

  return buildResponse(
    "reply",
    `${nickname}, trenutno nemaš aktivnu narudžbu i ne mogu pronaći prethodne narudžbe.`,
    [],
    [buildAction("open_home", "Početak")]
  );
}

    if (isAskingRecommendations(message)) {
      return buildRecommendationTypeMenuResponse(nickname);
    }

    if (isAskingPopularItems(message)) {
      const items = buildPopularItems(allOrders, foods, drinks, 3);

      return buildResponse(
        "popular_items",
        items.length > 0 ?
          `${nickname}, trenutno su najpopularniji artikli: ${items.join(", ")}.` :
          `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
        items,
       items.length > 0 ? buildRecommendationItemActions(items, "recommend_popular") : [buildAction("open_home", "Početak")]
      );
    }

      const contextJson = formatContextJson(foods, drinks);
const ordersContextJson = buildOrdersContext(activeOrder, null);
if (isSmallTalk(message)) {
  return buildResponse(
    "reply",
    `${nickname}, bok. Mogu ti pomoći s jelovnikom, cijenama, alergenima, preporukama i statusom narudžbe. Za dodavanje artikala koristi ponuđene gumbe.`,
    [],
    buildDefaultInfoActions()
  );
}

    if (isOrderingIntent(message)) {
      const matches = extractExactMenuMatches(message, foods, drinks);

      if (matches.length > 0) {
        return buildResponse(
          "reply",
          `${nickname}, prepoznao sam: ${matches.join(", ")}. Za dodavanje u narudžbu koristi pregled jelovnika i ponuđene gumbe, kako bih sigurno dodao točan artikl.`,
          matches,
         buildMainActions()
        );
      }

      return buildResponse(
        "reply",
        `${nickname}, za dodavanje artikala u narudžbu koristi pregled jelovnika i ponuđene gumbe. U chatu ti mogu pomoći s informacijama o jelovniku, alergenima, cijenama i preporukama.`,
        [],
        buildMainActions()
      );
    }

if (isAskingDrinksWithAllergens(message)) {
  return buildDrinksWithAllergensResponse(nickname, drinks);
}
    if (isFollowUpWhichOrder(message) && wasLastAssistantAboutOrderStatus(history)) {
      if (activeOrders.length > 0) {
        return buildOrderSelectionResponse(nickname, activeOrders);
      }

      if (lastAnyOrder) {
        const items = getOrderItems(lastAnyOrder);
        const status = lastAnyOrder.status || "Nepoznat status";

        return buildResponse(
          "last_any_order_actions",
          items.length > 0 ?
            `${nickname}, mislim na tvoju zadnju narudžbu: ${items.join(", ")}. Status: ${status}.` :
            `${nickname}, mislim na tvoju zadnju narudžbu, ali nema stavki za prikaz. Status: ${status}.`,
          items,
          [
            buildAction("open_last_any_order", "Prikaži zadnju narudžbu"),
            buildAction("open_order_status", "Status aktivnih narudžbi"),
            buildAction("open_home", "Početak"),
          ]
        );
      }

      return buildResponse(
        "reply",
        `${nickname}, trenutno ne mogu pronaći narudžbu na koju se pitanje odnosi.`,
        [],
        [buildAction("open_home", "Početak")]
      );
    }

      const answer = await callGemini({
        apiKey,
        message,
        contextJson,
        ordersContextJson,
        nickname,
        historyText,
      });

    return buildResponse(
      "reply",
      answer,
      [],
    buildMainActions()
    );
    } catch (err) {
      console.error("chatWaiter error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError(
        "internal",
        "Greška na serveru (chatWaiter).",
        {
          message: err?.message || "Unknown error",
        }
      );
    }
  }
);