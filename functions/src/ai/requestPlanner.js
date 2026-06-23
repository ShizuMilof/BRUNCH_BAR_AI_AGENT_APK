/* eslint-disable */

const {
  callOpenAI,
} = require("./openai");

async function planUserRequest({
  apiKey,
  message,
  cartItems = [],
}) {
  const prompt = `
Ti si request planner za AI konobara u restoranu.

Tvoj posao:
- Razumjeti što korisnik želi.
- Vratiti SAMO JSON.
- Ne izvršavaš narudžbu.
- Ne izmišljaš artikle.
- Ako korisnik nije precizan, označi needsClarification true.

Mogući intenti:
- last_order
- order_history
- order_status
- show_cart
- recommendation
- popular_items
- menu_category_question
- ordering
- repeat_order
- finish_order
- small_talk
- unknown

Vrati JSON u ovom obliku:
{
  "intent": "unknown",
  "category": "",
  "items": [
    {
      "name": "",
      "category": "",
      "quantity": 1,
      "note": ""
    }
  ],
  "needsClarification": false,
  "clarificationQuestion": "",
  "confidence": 0.0
}

Pravila:
- Ako korisnik pita što je zadnje jeo ili što je zadnje naručio, intent je last_order.
- Ako korisnik pita što je prije naručivao općenito ili traži povijest naručivanja, intent je order_history.
- Ako pita status narudžbe, intent je order_status.
- Ako pita što ima u košarici, intent je show_cart.
- Ako traži preporuku, intent je recommendation.
- Ako pita što je popularno, intent je popular_items.
- Ako pita što ima od neke kategorije, intent je menu_category_question.
- Ako želi dodati/naručiti nešto, intent je ordering.
- Ako želi ponoviti prošlu narudžbu, intent je repeat_order.
- Ako želi završiti/poslati narudžbu, intent je finish_order.
- Ako je pozdrav, intent je small_talk.
- Ako nije jasno, intent je unknown.

Kategorije:
- pizza
- sendvič
- desert
- predjelo
- juha
- pašta
- piće
- sok
- kava
- alkohol
- ostalo

Posebno važno:
- "kaj sam zadnje jeo" => last_order
- "što sam zadnje naručio" => last_order
- "kaj sam prije naručivao" => order_history
- "koja je moja povijest naručivanja" => order_history
- "koje pizze imaš" => menu_category_question, category "pizza"
- "što imaš od deserata" => menu_category_question, category "desert"
- "daj mi pizzu" => ordering, category "pizza", needsClarification true
- "hoću sendvič" => ordering, category "sendvič", needsClarification true
- "dodaj jednu koka kolu" => ordering, item name "koka kola", quantity 1
- "predloži mi nešto" => recommendation
- "što je popularno" => popular_items

Ako korisnik traži generičku stvar kao "pizza", "sendvič", "desert":
- intent neka bude ordering ako želi naručiti.
- needsClarification neka bude true.
- clarificationQuestion neka pita koju opciju želi.

Primjeri:

Poruka: "kaj sam zadnje jeo"
Odgovor:
{"intent":"last_order","category":"","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "što sam zadnje naručio"
Odgovor:
{"intent":"last_order","category":"","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "koja je moja povijest naručivanja"
Odgovor:
{"intent":"order_history","category":"","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "kaj sam prije naručivao"
Odgovor:
{"intent":"order_history","category":"","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "koje pizze imaš"
Odgovor:
{"intent":"menu_category_question","category":"pizza","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "što imaš od deserata"
Odgovor:
{"intent":"menu_category_question","category":"desert","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "daj mi pizzu"
Odgovor:
{"intent":"ordering","category":"pizza","items":[{"name":"","category":"pizza","quantity":1,"note":""}],"needsClarification":true,"clarificationQuestion":"Koju pizzu želiš?","confidence":0.95}

Poruka: "dodaj jednu koka kolu"
Odgovor:
{"intent":"ordering","category":"piće","items":[{"name":"koka kola","category":"piće","quantity":1,"note":""}],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}

Poruka: "što imaš od glavnih jela"
Odgovor:
{"intent":"menu_category_question","category":"glavno","items":[],"needsClarification":false,"clarificationQuestion":"","confidence":0.95}
KOŠARICA:
${JSON.stringify(cartItems, null, 2)}

PORUKA:
${message}
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

    const jsonText = start !== -1 && end !== -1 ?
      cleaned.substring(start, end + 1) :
      cleaned;

    const parsed = JSON.parse(jsonText);

    return normalizePlan(parsed);
  } catch (err) {
    console.error("planUserRequest error:", text);

    return createUnknownPlan();
  }
}

function normalizePlan(parsed) {
  const allowedIntents = [
    "last_order",
    "order_history",
    "order_status",
    "show_cart",
    "recommendation",
    "popular_items",
    "menu_category_question",
    "ordering",
    "repeat_order",
    "finish_order",
    "small_talk",
    "unknown",
  ];

  const intent = allowedIntents.includes(parsed.intent) ?
    parsed.intent :
    "unknown";

  const items = Array.isArray(parsed.items) ?
    parsed.items.map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      category: typeof item.category === "string" ? item.category : "",
      quantity: Number(item.quantity || 1),
      note: typeof item.note === "string" ? item.note : "",
    })) :
    [];

  return {
    intent,
    category: typeof parsed.category === "string" ? parsed.category : "",
    items,
    needsClarification: parsed.needsClarification === true,
    clarificationQuestion:
      typeof parsed.clarificationQuestion === "string" ?
        parsed.clarificationQuestion :
        "",
    confidence: Number(parsed.confidence || 0),
  };
}

function createUnknownPlan() {
  return {
    intent: "unknown",
    category: "",
    items: [],
    needsClarification: false,
    clarificationQuestion: "",
    confidence: 0,
  };
}

module.exports = {
  planUserRequest,
};