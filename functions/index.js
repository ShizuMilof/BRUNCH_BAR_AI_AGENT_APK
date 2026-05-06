/* eslint-disable max-len */

const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
async function callOpenAI({apiKey, prompt, temperature = 0.2}) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("OPENAI ERROR:", JSON.stringify(data));
    throw new Error(JSON.stringify(data));
  }

  const text =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      ?.map((content) => content.text || "")
      ?.join("")
      ?.trim() ||
    "";

  console.log("OPENAI FULL DATA:", JSON.stringify(data));
  console.log("OPENAI TEXT:", text);

  return text;
}


function cleanNote(note) {
  if (!note) return "";

  const cleaned = note.trim();
  const lower = normalizeText(cleaned);

  const invalidOnly = [
    "ubaci",
    "dodaj",
    "daj",
    "daj mi",
    "stavi",
    "stavi mi",
    "zelim",
    "hocu",
    "naruci",
  ];

  if (invalidOnly.includes(lower)) return "";

return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);}

async function parseOrderFromMessage({apiKey, message, foods, drinks, modifications}) {
   const parserItems = buildMenuParserItems(foods, drinks, modifications);
    const fixedMessage = fixTypos(message);

  const prompt = `
Ti si parser narudžbe za restoran.

Iz korisnikove poruke izvuci artikle, količine i modifikacije.

Vrati SAMO JSON:
{
  "items": [
    {
      "name": "TOČAN_NAZIV_IZ_MENIJA",
      "quantity": 1,
      "modifications": ["TOČNA_MODIFIKACIJA_IZ_BAZE"],
      "note": ""
    }
  ],
  "unrecognized": []
}
PRAVILA:
- Artikle prepoznaj po name ili aliases.
- name mora biti identičan vrijednosti iz MENIJA.
- Vrati samo artikle koji postoje u MENI.
- Ako nisi siguran koji je artikl, nemoj ga vratiti.
- Ako korisnik napiše djelomičan ili krivo napisan naziv (npr. "aj" umjesto "čaj"),
  pokušaj pronaći NAJBLIŽI naziv iz menija koristeći kontekst ostatka rečenice.
- Primjer: "aj od marelice" → "ČAJ OD MARELICE"
- Nemoj pogađati nasumično, već koristi riječi oko naziva.
- Ako korisnik navede više artikala odvojene zarezom ili riječju "i", pokušaj prepoznati SVAKI artikl posebno.
- Pića i hranu smiješ vratiti zajedno u istom odgovoru.
- Ako korisnik napiše "čaj od marelice, čaj od kruške i svježi sok s ciklom", moraš vratiti sva 3 pića ako postoje u MENI.
- Nemoj stati nakon prva dva artikla.
- Ako korisnik traži artikl koji ne možeš sigurno povezati s MENI, nemoj ga staviti u items.
- Takav neprepoznati artikl stavi u unrecognized kao tekst korisnika.
- Primjer: ako korisnik napiše "sok od cikle", a toga nema u MENI, vrati "unrecognized":["sok od cikle"].

MODIFIKACIJE:
- Modifikacije smiješ koristiti SAMO iz polja modifications tog artikla.
- Modifikacija mora biti ista kao jedna od ponuđenih vrijednosti iz modifications.
- NIKAD nemoj pretpostavljati modifikacije.
- NIKAD nemoj dodavati slične modifikacije.
- NIKAD nemoj zamijeniti korisnikov zahtjev nekom drugom modifikacijom.
- Ako korisnik traži nešto što nije identična službena modifikacija za taj artikl, stavi to u note.
- Ako korisnik kaže "s kulenom", a artikl nema "S KULENOM" u modifications, modifications mora biti [], a note mora biti "s kulenom".
- Ako korisnik kaže "bez leda", a artikl nema "BEZ LEDA" u modifications, modifications mora biti [], a note mora biti "bez leda".
- Ako korisnik kaže "s limunom", a artikl nema "S LIMUNOM" u modifications, modifications mora biti [], a note mora biti "s limunom".
- Ako korisnik kaže "bez gljiva", a artikl ima "BEZ GLJIVA" u modifications, koristi "BEZ GLJIVA".
- Ako korisnik kaže "s ledom", a artikl ima "S LEDOM" u modifications, koristi "S LEDOM".
- Ako modifikacija nije identična jednoj iz modifications, NIKADA je nemoj staviti u modifications, čak ni ako je vrlo slična.

NAPOMENE:
- note koristi za neslužbene dodatke ili posebne želje konobaru.
- note koristi za: "za van", "odvojeno pakiranje", "bez žurbe", "posebno", "nemoj previše grijati", "bez soli", "s limunom", "s kulenom".
- Riječi akcije nikad nisu note.

IGNORIRAJ RIJEČI AKCIJE:
- "dodaj", "ubaci", "daj", "daj mi", "stavi", "stavi mi", "želim", "hoću", "naruči".

KOLIČINE:
- jedna/jedan/jedno/1 = 1
- dvije/dva/2 = 2
- tri/3 = 3
- četiri/4 = 4
- pet/5 = 5
- šest/6 = 6
- sedam/7 = 7
- osam/8 = 8
- devet/9 = 9
- deset/10 = 10
- Ako nema količine, quantity je 1.

OSTALO:
- Ako ništa ne prepoznaš, vrati {"items":[]}.
- Ne piši ništa osim JSON-a.
- Ako korisnik napiše djelomičan naziv, pronađi najbliži naziv iz MENIJA.
- Dozvoljeno je fuzzy prepoznavanje naziva artikla, ali NE modifikacija.
- Nikad ne smiješ tvrditi da je narudžba završena, poslana ili zaprimljena u kuhinji.

PRIMJER:
Poruka: "dvije kapricoze bez gljiva za van"
Odgovor:
{"items":[{"name":"PIZZA CAPRICCIOSA","quantity":2,"modifications":["BEZ GLJIVA"],"note":"za van"}]}

PRIMJER:
Poruka: "daj mi dvije kapricoze s kulenom"
Odgovor:
{"items":[{"name":"PIZZA CAPRICCIOSA","quantity":2,"modifications":[],"note":"s kulenom"}]}

PRIMJER:
Poruka: "daj mi kapricozu bez gljiva s kulenom"
Odgovor:
{"items":[{"name":"PIZZA CAPRICCIOSA","quantity":1,"modifications":["BEZ GLJIVA"],"note":"s kulenom"}]}


PRIMJER:
Poruka: "daj mi pizzu capricciosu, sendvič šunka sir, čaj od marelice, čaj od kruške i svježi sok s ciklom"
Odgovor:
{"items":[{"name":"PIZZA CAPRICCIOSA","quantity":1,"modifications":[],"note":""},{"name":"SENDVIČ ŠUNKA SIR","quantity":1,"modifications":[],"note":""},{"name":"ČAJ OD MARELICE","quantity":1,"modifications":[],"note":""},{"name":"ČAJ OD KRUŠKE","quantity":1,"modifications":[],"note":""},{"name":"SVJEŽI SOK OD NARANČE","quantity":1,"modifications":[],"note":""}]}

MENI:
${JSON.stringify(parserItems)}

PORUKA:
${fixedMessage}
`.trim();

  const text = await callOpenAI({
    apiKey,
    prompt,
    temperature: 0,
  });

  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonText = start !== -1 && end !== -1
      ? cleaned.substring(start, end + 1)
      : cleaned;

    const parsed = JSON.parse(jsonText);
    const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
const availableNames = buildMenuNameSet(foods, drinks);
const unrecognized = Array.isArray(parsed.unrecognized)
  ? parsed.unrecognized.map((x) => x.toString().trim()).filter(Boolean)
  : [];

  const resolvedFromUnrecognized = resolveUnrecognizedItems(
    unrecognized,
    foods,
    drinks
  );

  const allParsedItems = [
    ...parsedItems,
    ...resolvedFromUnrecognized,
  ];

 const resolvedOriginalTexts = new Set(
   resolvedFromUnrecognized.map((item) => normalizeText(item.originalText))
 );

 const finalUnrecognized = unrecognized.filter((item) =>
   !resolvedOriginalTexts.has(normalizeText(item))
 );
   return {
     unrecognized: finalUnrecognized,
     items: allParsedItems
       .filter((item) => item?.name && availableNames.has(item.name))
       .map((item) => {
        const quantity = Number(item.quantity || 1);

        const officialMods = Object.values(modifications[item.name] || {})
          .map((m) => m.toString().trim());

        const requestedMods = Array.isArray(item.modifications)
          ? item.modifications.map((m) => m.toString().trim()).filter(Boolean)
          : [];

        const validMods = [];
        const invalidMods = [];

        requestedMods.forEach((mod) => {
          const found = officialMods.find((official) =>
            normalizeText(official) === normalizeText(mod)
          );

          if (found) {
            validMods.push(found);
          } else {
            invalidMods.push(mod);
          }
        });

        const noteRaw = typeof item.note === "string" ? item.note.trim() : "";
const extraNote = invalidMods.length > 0
  ? invalidMods.join(", ")
  : "";
          const combinedNoteRaw = [noteRaw, extraNote].filter(Boolean).join(", ");
        const note = cleanNote(combinedNoteRaw);

        const mods = validMods;
          let textItem = `${item.name}`;

          if (mods.length > 0) {
            textItem += `\n\nMODIFIKACIJE: ${mods.join(", ")}`;
          }

          if (note) {
            textItem += `\n\nNAPOMENA: ${note}`;
          }

          textItem += ` (X${quantity > 0 ? quantity : 1})`;

          return textItem;
        }),
    };
  } catch (err) {
    console.error("parseOrderFromMessage error:", text);
return {items: [], unrecognized: []};  }
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

function buildRecommendedDrinksForFoodResponse(nickname, message, foods, drinks) {
  const matches = extractExactMenuMatches(message, foods, []);

  if (!matches.length) {
    return buildResponse(
      "reply",
      `${nickname}, napiši za koje jelo želiš preporučeno piće.`,
      [],
      buildMainActions()
    );
  }

  const food = foods.find((f) => f.name === matches[0]);

  if (!food || !food.preporucenaPica) {
    return buildResponse(
      "reply",
      `${nickname}, za ${matches[0]} nemam navedena preporučena pića.`,
      [],
      buildMainActions()
    );
  }

  const recommended = Object.keys(food.preporucenaPica)
    .filter((id) => food.preporucenaPica[id])
    .map((id) => drinks.find((d) => String(d.id) === String(id))?.name)
    .filter(Boolean);

  return buildResponse(
    "reply",
    recommended.length > 0
      ? `${nickname}, uz ${food.name} preporučujem: ${recommended.join(" ili ")}.`
      : `${nickname}, za ${food.name} trenutno nemam dostupna preporučena pića.`,
    recommended,
    buildMainActions()
  );
}

function hasNote(items) {
  return items.some((item) => item.includes("NAPOMENA:"));
}

function extractPopularItemNames(popularItems) {
  return popularItems.flatMap((entry) => {
    const parts = entry.split(":");
    if (parts.length < 2) return [entry.trim()];

    return parts[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });
}

function normalizeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
}
function buildOrderStatusResponse(nickname, activeOrder) {
  return buildResponse(
    "order_status",
    activeOrder
      ? `${nickname}, status tvoje zadnje aktivne narudžbe je: ${activeOrder.status || "Nepoznat status"}.`
      : `${nickname}, trenutačno nemaš aktivnu narudžbu.`,
    [],
    activeOrder
      ? [buildAction(`refresh_order_status|${activeOrder.key || activeOrder.id || ""}`, "Osvježi status")]
      : []
  );
}

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

function buildCartResponse(nickname, cartItems) {
  const items = Array.isArray(cartItems)
    ? cartItems.filter((item) => typeof item === "string" && item.trim())
    : [];

  if (!items.length) {
    return buildResponse(
      "cart_preview",
      `${nickname}, tvoja košarica je trenutno prazna.`,
      [],
      [
        buildAction("open_menu_browser", "Dodaj artikle"),
        buildAction("open_home", "Početak"),
      ]
    );
  }

const formattedItems = items.map((item) => {
  const base = item
    .split("\n")[0]
    .replace(/\(X\d+\)/i, "")
    .trim();

  const quantityMatch = item.match(/\(X(\d+)\)/i);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

  const modsMatch = item.match(/MODIFIKACIJE:([\s\S]*?)(?:\n\nNAPOMENA:|\s*\(X\d+\)|$)/i);
  const mods = modsMatch ? modsMatch[1].trim() : "";

  const noteMatch = item.match(/NAPOMENA:([\s\S]*?)(?:\s*\(X\d+\)|$)/i);
  const note = noteMatch ? noteMatch[1].trim() : "";

  let text = `- ${base.toLowerCase()}`;

  const details = [];

  if (mods) {
    details.push(`modifikacije: ${mods.toLowerCase()}`);
  }

  if (note) {
    details.push(`napomena: ${note.toLowerCase()}`);
  }

  if (details.length > 0) {
    text += ` -> ${details.join(", ")}`;
  }

  if (quantity > 1) {
    text += ` x${quantity}`;
  }

  return text;
});

  return buildResponse(
    "cart_preview",
    `${nickname}, u tvojoj košarici imaš:\n\n${formattedItems.join("\n\n")}`,
    items,
    [
      buildAction("go_to_cart", "Završi narudžbu"),
      buildAction("open_menu_browser", "Dodaj još"),
      buildAction("open_home", "Početak"),
    ]
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

function extractBaseItemName(orderItem) {
  if (!orderItem || typeof orderItem !== "string") return "";

  return orderItem
    .split("\n")[0]
    .replace(/\(X\d+\)/i, "")
    .trim();
}

function extractNote(item) {
  const match = item.match(/NAPOMENA:\s*([\s\S]*?)(?:\s*\(X\d+\)|$)/i);
  return match ? match[1].trim() : "";
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

function fixTypos(text) {
  return (text || "")
    .replace(/\baj\b/gi, "čaj")
    .replace(/\bcaj\b/gi, "čaj")
    .replace(/\bsecer\b/gi, "šećer")
    .replace(/\bnarance\b/gi, "naranče")
    .replace(/\blimunom\b/gi, "limunom");
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

function getRecommendedDrinksForItems(items, foods, drinks) {
  const result = [];

  items.forEach((rawItem) => {
    const baseName = extractBaseItemName(rawItem);

    const food = foods.find((f) =>
      normalizeText(f.name) === normalizeText(baseName)
    );

    if (!food || !food.preporucenaPica) return;

    const recommended = Object.keys(food.preporucenaPica)
      .filter((id) => food.preporucenaPica[id])
      .map((id) => drinks.find((d) => String(d.id) === String(id))?.name)
      .filter(Boolean);

    if (recommended.length > 0) {
      result.push({
        food: food.name,
        drinks: [...new Set(recommended)].slice(0, 2),
      });
    }
  });

  return result;
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

function buildMenuNameSet(foods, drinks) {
  const names = [...foods, ...drinks]
    .map((item) => (item?.name || "").trim())
    .filter(Boolean);

  return new Set(names);
}

function buildMenuParserItems(foods, drinks, modifications = {}) {
  return [...foods, ...drinks]
    .filter((item) => item?.name)
    .map((item) => ({
      name: item.name,
      category: item.category || "",
      aliases: item.aliasi || [],
      modifications: Object.values(modifications[item.name] || {}),
    }));
}

function resolveUnrecognizedItems(unrecognized, foods, drinks) {
  const menu = [...foods, ...drinks];

  return unrecognized.flatMap((raw) => {
    const text = normalizeText(raw);

    const matches = menu.filter((item) => {
      const name = normalizeText(item.name || "");
      const aliases = Array.isArray(item.aliasi) ? item.aliasi : [];

      return (
        name.includes(text) ||
        text.includes(name) ||
        aliases.some((a) => normalizeText(a) === text)
      );
    });

    if (matches.length === 1) {
    return [{
      originalText: raw,
      name: matches[0].name,
      quantity: 1,
      modifications: [],
      note: "",
    }];
    }

    return [];
  });
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

function isConfirmYes(message) {
  const text = normalizeText(message);
  return ["da", "yes", "može", "moze"].includes(text);
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

function buildPopularItems(allOrders, foods, drinks, limitPerCategory = 1) {
  const menu = [...foods, ...drinks];
  const menuByName = new Map(menu.map((item) => [item.name, item]));

  const deliveredOrders = allOrders.filter((order) =>
    normalizeText(order?.status || "") === normalizeText("Dostavljeno")
  );

  const counts = new Map();

  deliveredOrders.forEach((order) => {
    getOrderItems(order).forEach((rawItem) => {
      const baseName = extractBaseItemName(rawItem);
      if (!menuByName.has(baseName)) return;

      const quantityMatch = rawItem.match(/\(X(\d+)\)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

      counts.set(baseName, (counts.get(baseName) || 0) + quantity);
    });
  });

  const byCategory = new Map();

  [...counts.entries()].forEach(([name, count]) => {
    const item = menuByName.get(name);
    const category = item?.category || "OSTALO";

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }

    byCategory.get(category).push({name, count});
  });

  const result = [];

  [...byCategory.entries()]
    .sort(([catA], [catB]) => catA.localeCompare(catB, "hr"))
    .forEach(([category, items]) => {
      const popularInCategory = items
        .sort((a, b) => b.count - a.count)
        .slice(0, limitPerCategory)
        .map((item) => item.name);

      if (popularInCategory.length > 0) {
        result.push(`${category}: ${popularInCategory.join(", ")}`);
      }
    });

  return result;
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
    secrets: [GEMINI_API_KEY, OPENAI_API_KEY],
  },
  async (request) => {
    try {
      const message = (request.data?.message || "").trim();
      const action = (request.data?.action || "").trim();
      const userId = (request.data?.userId || "").trim();
      const nickname = (request.data?.nickname || "Gost").trim();
      const history = Array.isArray(request.data?.history) ? request.data.history : [];
      const cartItems = Array.isArray(request.data?.cartItems) ? request.data.cartItems : [];
      const historyText = formatHistory(history);

      if (!message && !action) {
        throw new HttpsError("invalid-argument", "Poruka ili akcija su obavezni.");
      }

    const apiKey = GEMINI_API_KEY.value();
    const openAiKey = OPENAI_API_KEY.value();

    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Nedostaje GEMINI_API_KEY secret.");
    }

    if (!openAiKey) {
      throw new HttpsError("failed-precondition", "Nedostaje OPENAI_API_KEY secret.");
    }

      const root = admin.database().ref();

      const [picaSnap, hranaSnap, narudzbeSnap, modifikacijeSnap] = await Promise.all([
        root.child("pica").get(),
        root.child("hrana").get(),
        root.child("narudzbe").get(),
        root.child("modifikacije").get(),
      ]);
const modifications = modifikacijeSnap.val() || {};
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
  const popularItemNames = extractPopularItemNames(items);

  return buildResponse(
    "popular_items",
    items.length > 0 ?
      `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n")}\n\nTo su artikli koji se najčešće naručuju među svim gostima.` :
      `${nickname}, trenutačno nemam dovoljno podataka o popularnim artiklima.`,
    popularItemNames,
    popularItemNames.length > 0
      ? buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular")
      : [buildAction("open_home", "Početak")]
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
    const popularItemNames = extractPopularItemNames(items);

    return buildResponse(
      "popular_items",
      items.length > 0 ?
        `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
        `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
      popularItemNames,
      popularItemNames.length > 0
        ? buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular")
        : [buildAction("open_home", "Početak")]
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

if (isAskingRecommendedDrinksForFood(message)) {
  return buildRecommendedDrinksForFoodResponse(nickname, message, foods, drinks);
}

    if (isAskingRecommendations(message)) {
      return buildRecommendationTypeMenuResponse(nickname);
    }

  if (isAskingPopularItems(message)) {
    const items = buildPopularItems(allOrders, foods, drinks, 3);
    const popularItemNames = extractPopularItemNames(items);

    return buildResponse(
      "popular_items",
      items.length > 0 ?
        `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
        `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
      popularItemNames,
      popularItemNames.length > 0
        ? buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular")
        : [buildAction("open_home", "Početak")]
    );
  }

      const contextJson = formatContextJson(foods, drinks);
const ordersContextJson = buildOrdersContext(activeOrder, null);
if (isAskingCart(message)) {
  return buildCartResponse(nickname, cartItems);
}

if (isSmallTalk(message)) {
  return buildResponse(
    "reply",
    `${nickname}, bok. Mogu ti pomoći s jelovnikom, cijenama, alergenima, preporukama i statusom narudžbe. Za dodavanje artikala koristi ponuđene gumbe.`,
    [],
    buildDefaultInfoActions()
  );
}


if (isOrderingIntent(message)) {
  const parsed = await parseOrderFromMessage({
    apiKey: openAiKey,
    message,
    foods,
    drinks,
    modifications,
  });

if (parsed.items.length > 0) {
const recommendedDrinksByFood = getRecommendedDrinksForItems(parsed.items, foods, drinks);

const recommendationText = recommendedDrinksByFood.length > 0
  ? `\n\nPreporučena pića:\n${recommendedDrinksByFood
      .map((item) => `- uz ${item.food}: ${item.drinks.join(" ili ")}`)
      .join("\n")}`
  : "";
const noteText = parsed.items.some((item) => extractNote(item))
  ? "\n\nNeslužbene dodatke zapisao sam kao napomenu konobaru."
  : "";
  const formattedAddedItems = parsed.items.map((item) => {
    const base = item
      .split("\n")[0]
      .replace(/\(X\d+\)/i, "")
      .trim();

    const quantityMatch = item.match(/\(X(\d+)\)/i);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

    const modsMatch = item.match(/MODIFIKACIJE:\s*([\s\S]*?)(?:\n\nNAPOMENA:|\s*\(X\d+\)|$)/i);
    const mods = modsMatch ? modsMatch[1].trim() : "";

    const noteMatch = item.match(/NAPOMENA:\s*([\s\S]*?)(?:\s*\(X\d+\)|$)/i);
    const note = noteMatch ? noteMatch[1].trim() : "";

    let text = `- ${base}`;

    const details = [];

    if (mods) {
      details.push(`modifikacije: ${mods}`);
    }

    if (note) {
      details.push(`napomena: ${note}`);
    }

    if (details.length > 0) {
      text += ` -> ${details.join(", ")}`;
    }

    if (quantity > 1) {
      text += ` x${quantity}`;
    }

    return text;
  });

const unrecognizedText = parsed.unrecognized?.length > 0
  ? `\n\nNisam prepoznao: ${parsed.unrecognized.join(", ")}. Provjeri naziv artikla ili ga odaberi iz pregleda jelovnika.`
  : "";

return buildResponse(
  "chat_order_added",
  `${nickname}, dodao sam:\n\n${formattedAddedItems.join("\n\n")}\n\nU pregledu narudžbe uvijek možeš promijeniti količinu ili dodati dodatke/napomenu.${recommendationText}${noteText ? `\n${noteText}` : ""}${unrecognizedText}\n\nŽeliš li još nešto?`,
  parsed.items,
  [
    ...[...new Set(recommendedDrinksByFood.flatMap((item) => item.drinks))].map((drink) =>
      buildAction(`pick_menu_item|${drink}|open_menu_browser`, `Dodaj ${drink}`)
    ),
    buildAction("go_to_cart", "Završi narudžbu"),
    buildAction("open_menu_browser", "Dodaj još"),
    buildAction("open_home", "Početak"),
  ]
);
}

  return buildResponse(
    "reply",
    `${nickname}, nisam razumio koje artikle želiš.`,
    [],
    buildMainActions()
  );
}



if (isAskingDrinksWithAllergens(message)) {
  return buildDrinksWithAllergensResponse(nickname, drinks);
}

if (isFinishOrderIntent(message)) {
  return buildResponse(
    "reply",
    `${nickname}, za završetak narudžbe otvori pregled košarice i tamo potvrdi slanje narudžbe.`,
    [],
    [
      buildAction("go_to_cart", "Završi narudžbu"),
      buildAction("open_home", "Početak"),
    ]
  );
}


if (isConfirmYes(message)) {
  return buildResponse(
    "reply",
    `${nickname}, za potvrdu dodavanja koristi ponuđene gumbe ili napiši što želiš dodati.`,
    [],
    buildMainActions()
  );
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

 const answer = await callOpenAI({
   apiKey: openAiKey,
   prompt: `
 Ti si pametni AI konobar za restoran.

 Odgovaraj na hrvatskom jeziku.
 Korisniku se obraćaj imenom: ${nickname}.
 Koristi samo podatke iz konteksta.
 Ne izmišljaj artikle, cijene, alergene ni preporuke.
 Ako nešto ne znaš, reci da nemaš taj podatak.
 Odgovor neka bude kratak, najviše 3 rečenice.
 Za dodavanje artikala korisnik može pisati u chat ili koristiti gumbe.
- Nikad ne tvrdi da korisnik već ima artikl u košarici osim ako je to izričito navedeno u cartItems kontekstu.
- Ne koristi prethodni razgovor kao dokaz sadržaja košarice.
- Ako korisnik želi dodati artikl, a nisi u parseru, reci da napiše točan artikl ili koristi gumbe.

 PRETHODNI RAZGOVOR:
 ${historyText}

 KONTEKST NARUDŽBI:
 ${ordersContextJson}

 KOŠARICA:
 ${JSON.stringify(cartItems, null, 2)}

 KORISNIK:
 ${message}
 `.trim(),
   temperature: 0.2,
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

