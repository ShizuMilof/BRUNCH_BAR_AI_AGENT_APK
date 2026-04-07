/* eslint-disable max-len */

const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * Pretvori Firebase objekt ili array u čistu listu.
 * @param {*} val
 * @return {Array}
 */
function normalizeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
}

/**
 * Normaliziraj tekst za lakše prepoznavanje.
 * @param {string} text
 * @return {string}
 */
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Je li korisnik pitao što je naručio prošli put.
 * @param {string} message
 * @return {boolean}
 */
function isAskingAboutLastOrder(message) {
  const text = normalizeText(message);

  const phrases = [
    "sto sam prosli put narucio",
    "sta sam prosli put narucio",
    "sto sam narucio prosli put",
    "sta sam narucio prosli put",
    "koja je bila moja prosla narudzba",
    "sto je bila moja prosla narudzba",
    "moja prosla narudzba",
    "prosla narudzba",
    "zadnja narudzba",
  ];

  return phrases.some((phrase) => text.includes(phrase));
}

/**
 * Jedina dozvoljena komanda za ponovno dodavanje prošle narudžbe.
 * @param {string} message
 * @return {boolean}
 */
function isRepeatLastOrderCommand(message) {
  return normalizeText(message) === "naruci mi kao prosli put";
}

/**
 * Treba li blokirati pokušaj izmjene narudžbe kroz chat.
 * @param {string} message
 * @return {boolean}
 */
function isBlockedOrderAction(message) {
  // NE blokiraj:
  if (isRepeatLastOrderCommand(message)) return false;
  if (isAskingAboutLastOrder(message)) return false;

  const text = normalizeText(message);

  const blockedWords = [
    "dodaj",
    "ubaci",
    "stavi",
    "makni",
    "ukloni",
    "otkazi",
    "otkaži",
    "promijeni",
    "jos",
    "još",
    "naruci mi",
    "zelim naruciti",
  ];

  return blockedWords.some((word) => text.includes(normalizeText(word)));
}

/**
 * Vrati samo dostupne artikle ako polje dostupno postoji.
 * Ako ne postoji, artikl se zadržava.
 * @param {Array} items
 * @return {Array}
 */
function filterAvailable(items) {
  return items.filter((item) => item && item.dostupno !== false);
}

/**
 * Vrati listu stavki iz narudžbe.
 * @param {*} order
 * @return {Array<string>}
 */
function getOrderItems(order) {
  if (!order || !Array.isArray(order.stavke)) {
    return [];
  }

  return order.stavke.filter((item) => typeof item === "string" && item.trim());
}

/**
 * Sortiraj po nazivu radi stabilnog i urednog konteksta.
 * @param {Array} items
 * @return {Array}
 */
function sortByName(items) {
  return [...items].sort((a, b) => {
    const nameA = (a?.name || "").toString().toLowerCase();
    const nameB = (b?.name || "").toString().toLowerCase();
    return nameA.localeCompare(nameB, "hr");
  });
}

/**
 * Sortiraj narudžbe po createdAt silazno.
 * @param {Array} orders
 * @return {Array}
 */
function sortOrdersByCreatedAtDesc(orders) {
  return [...orders].sort((a, b) => {
    const aTime = Number(a?.createdAt || 0);
    const bTime = Number(b?.createdAt || 0);
    return bTime - aTime;
  });
}

/**
 * Očisti i pripremi artikle za AI kontekst.
 * @param {Array} foods
 * @param {Array} drinks
 * @return {{hrana: Array, pica: Array}}
 */
function buildMenuContext(foods, drinks) {
  return {
   hrana: foods.map((f) => ({
     id: f.id ?? null,
     naziv: f.name ?? "",
     kategorija: f.category ?? "",
     cijenaCent: f.cijenaCent ?? null,
     cijenaEur: centToEur(f.cijenaCent),
     valuta: "EUR",
     alergeni: f.alergeni ?? {},
     oznake: f.oznake ?? {},
     preporucenaPica: f.preporucenaPica ?? {},
     opis: f.opis ?? "",
   })),
   pica: drinks.map((d) => ({
     id: d.id ?? null,
     naziv: d.name ?? "",
     kategorija: d.category ?? "",
     cijenaCent: d.cijenaCent ?? null,
     cijenaEur: centToEur(d.cijenaCent),
     valuta: "EUR",
     alergeni: d.alergeni ?? {},
     oznake: d.oznake ?? {},
     opis: d.opis ?? "",
   })),
  };
}

/**
 * Pretvori menu context u JSON string za prompt.
 * @param {Array} foods
 * @param {Array} drinks
 * @return {string}
 */
function formatContextJson(foods, drinks) {
  const context = buildMenuContext(foods, drinks);
  return JSON.stringify(context, null, 2);
}

function centToEur(cents) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

/**
 * Vrati sigurni kontekst narudžbi za prompt.
 * @param {*} activeOrder
 * @param {*} lastCompletedOrder
 * @return {string}
 */
function buildOrdersContext(activeOrder, lastCompletedOrder) {
  return JSON.stringify(
    {
      trenutnaNarudzba: activeOrder || null,
      proslaNarudzba: lastCompletedOrder || null,
    },
    null,
    2
  );
}

/**
 * Pokušaj izvući tekst iz Gemini odgovora.
 * @param {*} data
 * @return {string}
 */
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

/**
 * Je li poruka prekratka ili nejasna.
 * @param {string} message
 * @return {boolean}
 */
function isTrivialMessage(message) {
  const text = normalizeText(message);

  if (!text) return true;
  if (text.length <= 1) return true;

  const trivialMessages = [
    "a",
    "e",
    "ee",
    "ej",
    "ejj",
    "aha",
    "ah",
    "hmm",
    "hm",
    "ok",
    "oke",
    "dobro",
    "mozda",
    "možda",
    "nezz",
    "nez",
    "?",
    "??",
    "...",
  ];

  return trivialMessages.includes(text);
}

/**
 * Odgovor za nejasnu poruku.
 * @param {string} nickname
 * @return {string}
 */
function getConfusedReply(nickname) {
  return `${nickname}, nisam te najbolje razumio. Možeš pitati za cijenu pića ili hrane, preporuku ili svoju prošlu narudžbu.`;
}

/**
 * Formatiraj povijest razgovora za prompt.
 * @param {Array} history
 * @return {string}
 */
function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "Nema.";
  }

  const lastMessages = history.slice(-4);

  return lastMessages
    .filter((item) => item && typeof item.text === "string")
    .map((item) => {
      const role = item.role === "assistant" ? "AI" : "Korisnik";
      return `${role}: ${item.text}`;
    })
    .join("\n");
}

/**
 * Poziv Gemini API-ja.
 * @param {{
 *   apiKey: string,
 *   message: string,
 *   contextJson: string,
 *   ordersContextJson: string,
 *   nickname: string,
 *   historyText: string
 * }} params
 * @return {Promise<string>}
 */
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
- SMIJEŠ koristiti ISKLJUČIVO stavke iz konteksta.
- Ne izmišljaj jela, pića, cijene, sastojke ni alergene.
- Ako korisnik pita što je naručio prošli put, koristi PROŠLU NARUDŽBU.
- Ako prošla narudžba postoji, reci koje su stavke bile u toj narudžbi.
- Na kraj takvog odgovora OBAVEZNO dodaj ovu rečenicu točno ovako:
  Prošlu narudžbu opet možete dodati tako da upišete 'Naruci mi kao prosli put'.
- Ne izvršavaš izmjene narudžbe.
- Nikada nemoj reći da si nešto dodao, uklonio, naručio, promijenio ili otkazao.
- Jedina stvarna akcija kroz chat je točna komanda: 'Naruci mi kao prosli put'.
- Za sve ostale pokušaje izmjene narudžbe reci da to nije moguće kroz chat.
- UVIJEK odgovaraj samo na zadnju poruku korisnika.
- Ignoriraj stare teme ako nisu relevantne.
- Odgovor neka bude kratak, jasan i praktičan.
- Sve cijene u polju "cijenaCent" su izražene u EURO centima.
- Sve cijene korisniku prikazuj ISKLJUČIVO u eurima (€).
- Primjer: 250 znači 2.50 €.
- Nikada ne prikazuj cijene u kunama niti spominji kune.

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
        maxOutputTokens: 400,
      },
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error("Gemini raw error:", raw);
    throw new Error(`Gemini error ${res.status}: ${raw}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (parseError) {
    console.error("Gemini parse error:", raw);
    throw new Error("Neuspješno parsiranje Gemini odgovora.");
  }

  return extractGeminiText(data);
}

/**
 * Callable function: smart waiter chat.
 */
exports.chatWaiter = onCall(
  {
    region: "europe-west1",
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    try {
      const message = (request.data?.message || "").trim();
      const userId = (request.data?.userId || "").trim();
      const nickname = (request.data?.nickname || "Gost").trim();
      const tableNumber = request.data?.tableNumber ?? null;
      const restaurant = (request.data?.restaurant || "").trim();
      const qrToken = (request.data?.qrToken || "").trim();
      const history = Array.isArray(request.data?.history) ?
        request.data.history :
        [];
      const historyText = formatHistory(history);

      if (!message) {
        throw new HttpsError("invalid-argument", "Poruka je prazna.");
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError(
          "failed-precondition",
          "Nedostaje GEMINI_API_KEY secret."
        );
      }

      const root = admin.database().ref();

      const [picaSnap, hranaSnap, narudzbeSnap] = await Promise.all([
        root.child("pica").get(),
        root.child("hrana").get(),
        root.child("narudzbe").get(),
      ]);

      let drinks = normalizeArray(picaSnap.val());
      let foods = normalizeArray(hranaSnap.val());
      const allOrders = normalizeArray(narudzbeSnap.val());

      drinks = sortByName(filterAvailable(drinks));
      foods = sortByName(filterAvailable(foods));

      if (foods.length === 0 && drinks.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          "Meni je trenutno prazan."
        );
      }

      const userOrders = userId ?
        allOrders.filter((order) => order && order.userId === userId) :
        [];

      const activeOrder = userOrders.find((order) => {
        const status = order?.status || "";
        return status !== "Dostavljeno" && status !== "Otkazano";
      }) || null;

      const completedOrders = sortOrdersByCreatedAtDesc(
        userOrders.filter((order) => order?.status === "Dostavljeno")
      );

      const lastCompletedOrder =
        completedOrders.length > 0 ? completedOrders[0] : null;

      const sortedUserOrders = sortOrdersByCreatedAtDesc(userOrders);

      const fallbackLastOrder =
        lastCompletedOrder ||
        (sortedUserOrders.length > 0 ? sortedUserOrders[0] : null);

      if (isRepeatLastOrderCommand(message)) {
        const repeatItems = getOrderItems(fallbackLastOrder);

        if (repeatItems.length === 0) {
          return {
            answer: `${nickname}, ne mogu pronaći tvoju prošlu narudžbu za ponovno dodavanje.`,
            action: "none",
            repeatItems: [],
            meta: {
              userOrdersFound: userOrders.length,
              hasLastOrder: !!fallbackLastOrder,
            },
          };
        }

        return {
          answer: `${nickname}, mogu ponovno dodati tvoju prošlu narudžbu: ${repeatItems.join(", ")}. Želiš li da to dodam u košaricu?`,
          action: "repeat_last_order",
          repeatItems,
          meta: {
            userOrdersFound: userOrders.length,
            hasLastOrder: !!fallbackLastOrder,
            repeatedItemsCount: repeatItems.length,
          },
        };
      }

      if (isTrivialMessage(message)) {
        return {
          answer: getConfusedReply(nickname),
          action: "none",
          repeatItems: [],
          meta: {
            trivialMessage: true,
          },
        };
      }

      if (isBlockedOrderAction(message)) {
        return {
          answer: `${nickname}, kroz chat nije moguće mijenjati narudžbu. Ako želiš ponovno dodati prošlu narudžbu, upiši točno: 'Naruci mi kao prosli put'.`,
          action: "none",
          repeatItems: [],
          meta: {
            blockedOrderMutation: true,
          },
        };
      }

      const contextJson = formatContextJson(foods, drinks);
      const ordersContextJson = buildOrdersContext(activeOrder, fallbackLastOrder);

      console.log("chatWaiter payload:", {
        message,
        userId,
        nickname,
        tableNumber,
        restaurant,
        qrToken,
        userOrdersFound: userOrders.length,
        hasActiveOrder: !!activeOrder,
        hasLastOrder: !!fallbackLastOrder,
      });

      const answer = await callGemini({
        apiKey,
        message,
        contextJson,
        ordersContextJson,
        nickname,
        historyText,
      });

      return {
        answer,
        meta: {
          foodsReturned: foods.length,
          drinksReturned: drinks.length,
          totalItemsReturned: foods.length + drinks.length,
          userOrdersFound: userOrders.length,
          hasActiveOrder: !!activeOrder,
          hasLastOrder: !!fallbackLastOrder,
        },
      };
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
          stack: err?.stack || null,
        }
      );
    }
  }
);