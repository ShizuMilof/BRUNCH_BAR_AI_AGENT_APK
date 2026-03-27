/* eslint-disable max-len */

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// Node 18+ / 20+ / 22: fetch postoji globalno.
// Ako ti ikad fali (npr. lokalno u nekom starijem okruženju), instaliraj node-fetch,
// ali na Node 22 u Cloud Functions 2nd gen ne treba.

admin.initializeApp();

// Firebase Secret (set via: firebase functions:secrets:set GEMINI_API_KEY)
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * Ensure value is an array and remove falsy items.
 * @param {*} val Input value
 * @return {Array} Normalized array
 */
function normalizeArray(val) {
  if (!Array.isArray(val)) return [];
  return val.filter(Boolean);
}

/**
 * Pick relevant foods/drinks based on user message heuristics.
 * @param {string} message User message
 * @param {Array} drinks Drinks list
 * @param {Array} foods Foods list
 * @return {{selectedFoods: Array, selectedDrinks: Array}} Selection result
 */
function pickRelevant(message, drinks, foods) {
  const t = (message || "").toLowerCase();

  let selectedFoods = foods.slice(0, 5);
  let selectedDrinks = drinks.slice(0, 5);

  // budžet 10€ (1000 centi)
  if (t.includes("10") || t.includes("€") || t.includes("eur")) {
    selectedFoods = foods
      .filter((f) => ((f.cijenaCent != null ? f.cijenaCent : 999999) <= 1000))
      .slice(0, 15);

    selectedDrinks = drinks
      .filter((d) => ((d.cijenaCent != null ? d.cijenaCent : 999999) <= 1000))
      .slice(0, 15);
  }

  // orašasti
  if (t.includes("oraš") || t.includes("oras")) {
    selectedFoods = foods
      .filter((f) => !(f.alergeni && f.alergeni.orasastiPlodovi === true))
      .slice(0, 15);

    selectedDrinks = drinks
      .filter((d) => !(d.alergeni && d.alergeni.orasastiPlodovi === true))
      .slice(0, 15);
  }

  // vegetarijansko
  if (t.includes("vegetar")) {
    selectedFoods = foods
      .filter((f) => (f.oznake && f.oznake.vegetarijansko === true))
      .slice(0, 15);
  }

  return { selectedFoods, selectedDrinks };
}

/**
 * Format menu context into JSON for the model prompt.
 * @param {Array} drinks Drinks list
 * @param {Array} foods Foods list
 * @return {string} JSON string
 */
function formatContext(drinks, foods) {
  return JSON.stringify(
    {
      hrana: foods.map((f) => ({
        id: f.id,
        naziv: f.name,
        kategorija: f.category,
        cijenaCent: (f.cijenaCent != null ? f.cijenaCent : null),
        alergeni: (f.alergeni != null ? f.alergeni : {}),
        oznake: (f.oznake != null ? f.oznake : {}),
        preporucenaPica: (f.preporucenaPica != null ? f.preporucenaPica : {}),
      })),
      pica: drinks.map((d) => ({
        id: d.id,
        naziv: d.name,
        kategorija: d.category,
        cijenaCent: (d.cijenaCent != null ? d.cijenaCent : null),
        alergeni: (d.alergeni != null ? d.alergeni : {}),
        oznake: (d.oznake != null ? d.oznake : {}),
      })),
    },
    null,
    2
  );
}

/**
 * Call Gemini API with a strict "use only context JSON" prompt.
 * @param {{apiKey: string, message: string, contextJson: string}} params Params
 * @return {Promise<string>} Model response text
 */
async function callGemini({ apiKey, message, contextJson }) {
  const model = "gemini-2.0-flash-lite";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    encodeURIComponent(apiKey);

  const prompt = `
Ti si "pametni konobar" za restoran.
SMIJEŠ koristiti ISKLJUČIVO stavke koje dobiješ u KONTEKSTU (JSON).
Ne izmišljaj jela/pića.
Odgovaraj na hrvatskom.
Kad navodiš cijenu, prikaži u € (cijenaCent/100).

KONTEKST:
${contextJson}

KORISNIK:
${message}
`.trim();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error("Gemini raw error:", raw);
    throw new Error(`Gemini error ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);

  let text = "Nema odgovora od modela.";
  if (
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts
  ) {
    const parts = data.candidates[0].content.parts;
    text = parts.map((p) => (p && p.text ? p.text : "")).join("").trim();
    if (!text) text = "Nema odgovora od modela.";
  }

  return text;
}

/**
 * Callable function: "smart waiter" chat endpoint.
 */
exports.chatWaiter = onCall(
  { region: "europe-west1", secrets: [GEMINI_API_KEY] },
  async (request) => {
    try {
      const message = (request.data && request.data.message ? request.data.message : "").trim();

      if (!message) {
        throw new HttpsError("invalid-argument", "Poruka je prazna.");
      }

      // ✅ Read from Firebase Secret in 2nd gen
      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "Nedostaje GEMINI_API_KEY secret.");
      }

      const root = admin.database().ref();
      const [picaSnap, hranaSnap] = await Promise.all([
        root.child("pica").get(),
        root.child("hrana").get(),
      ]);

      const drinks = normalizeArray(picaSnap.val());
      const foods = normalizeArray(hranaSnap.val());

      const picked = pickRelevant(message, drinks, foods);

      // formatContext(drinks, foods)
      const contextJson = formatContext(picked.selectedDrinks, picked.selectedFoods);

      const answer = await callGemini({ apiKey, message, contextJson });

      return {
        answer,
        meta: {
          foodsReturned: picked.selectedFoods.length,
          drinksReturned: picked.selectedDrinks.length,
        },
      };
   } catch (err) {
     console.error("chatWaiter error:", err);

     if (err instanceof HttpsError) throw err;

     throw new HttpsError(
       "internal",
       "Greška na serveru (chatWaiter).",
       {
         message: err?.message || "Unknown error",
         stack: err?.stack || null,
       }
     );
   }
);