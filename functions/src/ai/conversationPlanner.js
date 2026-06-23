/* eslint-disable */

const {
  callOpenAI,
} = require("./openai");

async function planConversation({
  apiKey,
  message,
  menuContext,
  cartItems = [],
  historyText = "Nema.",
}) {
  const prompt = `
Ti si AI konobar u restoranu.

Tvoj posao:
- Razumjeti korisnikovu poruku.
- Voditi narudžbu kroz razgovor.
- Vratiti SAMO JSON.
- Ne izmišljati artikle koji ne postoje u meniju.
- Ako korisnik nije dovoljno precizan, pitaj dodatno pitanje.
- Ako možeš sigurno prepoznati artikl, predloži dodavanje u košaricu.
- Ako korisnik pita kategoriju, vrati kategoriju.
- Ako korisnik pita povijest narudžbi, vrati odgovarajući intent.

Mogući intenti:
- menu_question
- category_question
- add_to_cart
- clarify_order
- order_history
- last_order
- show_cart
- order_status
- recommendation
- popular_items
- repeat_order
- finish_order
- small_talk
- unknown
- item_question
- repeat_order_filtered
- history_order_detail
- compose_order


Vrati JSON:
{
  "intent": "unknown",
  "category": "",
    "orderNumber": 0,
  "items": [
    {
      "name": "",
      "category": "",
      "quantity": 1,
      "note": ""
    }
  ],
  "reply": "",
  "suggestions": [],
  "needsClarification": false,
  "confidence": 0.0,
  "peopleCount": 0
}



Pravila:
- "koje pizze imaš" => category_question, category "pizza"
- "što imaš od deserata" => category_question, category "desert"
- "što imaš od predjela" => category_question, category "predjelo"
- "što imaš od glavnih jela" => category_question, category "glavno"
- "koja pića imaš" => category_question, category "piće"
- "koje piće imaš" => category_question, category "piće"
- "što imaš od pića" => category_question, category "piće"
- "šta imaš za piti" => category_question, category "piće"
- "što imaš za piti" => category_question, category "piće"
- koje sokove imaš => category_question, category "sokovi"
- a koje sokove imaš => category_question, category "sokovi"
- što imaš od sokova => category_question, category "sokovi"
- "što imaš od tostova" => category_question, category "tost"
- "koje tostove imaš" => category_question, category "tost"
- "što imaš od sendviča" => category_question, category "sendvič"
- "što imaš od salata" => category_question, category "salata"
- "daj mi pizzu" => clarify_order, category "pizza", needsClarification true
- "hoću tost" => clarify_order, category "tost", needsClarification true
- "daj mi tost" => clarify_order, category "tost", needsClarification true

- "hoću sendvič" => clarify_order, category "sendvič", needsClarification true
- "ovaj put bi samo sendvič" => clarify_order, category "sendvič", needsClarification true
- "dodaj jednu koka kolu" => add_to_cart, items name "koka kola", quantity 1
- "što sam prije naručivao" => order_history
- "koja je moja povijest naručivanja" => order_history
- "kaj sam zadnje jeo" => last_order
- "što je popularno" => popular_items
- "predloži mi nešto" => recommendation
- "što imam u košarici" => show_cart
- "završi narudžbu" => finish_order
- "što je povrtni tanjur" => item_question, items name "povrtni tanjur"
- "šta je to povrtni tanjur" => item_question, items name "povrtni tanjur"
- "objasni mi povrtni tanjur" => item_question, items name "povrtni tanjur"
- "kakav je povrtni tanjur" => item_question, items name "povrtni tanjur"
- "imaš opis za povrtni tanjur" => item_question, items name "povrtni tanjur"
- "ovaj put daj samo sendvic" => repeat_order_filtered, category "sendvič"
- "uzmi samo sendvic iz prosle narudzbe" => repeat_order_filtered, category "sendvič"
- "daj samo pizzu" => repeat_order_filtered, category "pizza"
- "samo desert" => repeat_order_filtered, category "desert"
- "prikaži narudžbu broj 2" => history_order_detail, orderNumber 2
- "pokazi narudzbu broj 3" => history_order_detail, orderNumber 3
- "narudžba broj 1" => history_order_detail, orderNumber 1
- "prikaži narudžbu broj 2" => history_order_detail, orderNumber 2
- "uzmi samo sendvič iz te narudžbe" => repeat_order_filtered, category "sendvič"
- "uzmi cezar salatu iz te narudžbe" => repeat_order_filtered, items name "cezar salata"
- "ovog puta cu samo cezar salatu" => repeat_order_filtered, items name "cezar salata"
- "daj samo cezar salatu" => repeat_order_filtered, items name "cezar salata"
- "samo cezar salatu" => repeat_order_filtered, items name "cezar salata"
- "bez dodataka" => repeat_order_filtered_without_modifications
- "s istim dodacima" => repeat_order_filtered_with_modifications
- "moze kao prije" => repeat_order_filtered_with_modifications
- "isto kao prije" => repeat_order_filtered_with_modifications
- "kao prosli put" => repeat_order_filtered_with_modifications

- "bez dodataka" => repeat_order_filtered_without_modifications
- "bez icega" => repeat_order_filtered_without_modifications
- "samo osnovno" => repeat_order_filtered_without_modifications
- "uzet cu pastu" => repeat_order_filtered, category "pasta"
- "uzmi pastu iz te narudžbe" => repeat_order_filtered, category "pasta"
- "samo pastu" => repeat_order_filtered, category "pasta"
- "uzet cu tijesto" => repeat_order_filtered, category "tijesto"
- "htio bih juhu, paštu i meso" => compose_order, items name "juha", "pasta", "meso", peopleCount 0, needsClarification true
- "složi mi ručak za 2 osobe" => compose_order, peopleCount 2
- "složi mi nešto" => compose_order, items category "predjelo", "glavno", "desert", "piće", peopleCount 0, needsClarification true
- "naručio bih nešto" => compose_order, items category "predjelo", "glavno", "desert", "piće", peopleCount 0, needsClarification true
- "daj mi ručak" => compose_order, items category "predjelo", "glavno", "piće", peopleCount 0, needsClarification true
- "daj mi nešto za jesti" => compose_order, items category "glavno", "piće", peopleCount 0, needsClarification true
- "nešto lagano" => compose_order, items category "salata", "piće", peopleCount 0, needsClarification true
- "predloži mi kompletnu narudžbu" => compose_order, items category "predjelo", "glavno", "desert", "piće", peopleCount 0, needsClarification true


Bitno:
- Ako korisnik napiše samo kategoriju uz želju za naručivanjem, nemoj pogađati točan artikl.
- Ako korisnik napiše "pizzu", "sendvič", "desert", pitaj koju opciju želi.
- Ako korisnik napiše konkretan artikl ili alias, stavi ga u items.
- Za "koka kola", "coca cola", "cola", "kola" koristi name "koka kola".
- Za "kapricoza" koristi name "kapricoza".
- confidence stavi visoko samo ako si siguran.
- Ako korisnik pita "što je", "šta je", "kakav je", "objasni mi" + naziv artikla, koristi item_question.
- Kod item_question obavezno stavi prepoznati naziv artikla u items[0].name.
- Ne odgovaraj opisom sam. Samo vrati intent item_question, backend će opis pročitati iz Firebase menija.
- Za široki upit o piću uvijek koristi category "piće", ne "sok".
- Za "tostovi", "tostova", "tost" uvijek koristi category "tost".
- "uzet cu pastu" => repeat_order_filtered, category "pasta"
- "uzmi pastu iz te narudžbe" => repeat_order_filtered, category "pasta"
- "samo pastu" => repeat_order_filtered, category "pasta"
- "uzet cu tijesto" => repeat_order_filtered, category "tijesto"
- Kod compose_order korisnik može tražiti općenite vrste hrane, npr. juha, pašta, meso.
- Nemoj odmah pogađati artikle ako nije rekao broj osoba.
- Ako broj osoba nije poznat, peopleCount mora biti 0 i needsClarification true.
- Backend će kasnije odabrati stvarne artikle iz menija.

MENI:
${JSON.stringify(menuContext, null, 2)}

KOŠARICA:
${JSON.stringify(cartItems, null, 2)}

PRETHODNI RAZGOVOR:
${historyText}

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

    return normalizeConversationPlan(JSON.parse(jsonText));
  } catch (err) {
    console.error("planConversation error:", text);

    return createUnknownPlan();
  }
}

function normalizeConversationPlan(parsed) {
  const allowedIntents = [
    "menu_question",
    "category_question",
    "add_to_cart",
    "clarify_order",
    "order_history",
    "last_order",
    "show_cart",
    "order_status",
    "recommendation",
    "popular_items",
    "repeat_order",
    "finish_order",
    "small_talk",
    "unknown",
    "item_question",
"history_order_detail",
"repeat_order_filtered",
"repeat_without_modifications",
"repeat_with_modifications",
"history_order_detail",
"repeat_order_filtered",
"repeat_order_filtered_without_modifications",
"repeat_order_filtered_with_modifications",
"compose_order",
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

  const suggestions = Array.isArray(parsed.suggestions) ?
    parsed.suggestions
      .map((item) => item.toString().trim())
      .filter(Boolean) :
    [];

 return {
   intent,
   category: typeof parsed.category === "string" ? parsed.category : "",
   orderNumber: Number(parsed.orderNumber || 0),
   peopleCount: Number(parsed.peopleCount || 0),
   items,
   reply: typeof parsed.reply === "string" ? parsed.reply : "",
   suggestions,
   needsClarification: parsed.needsClarification === true,
   confidence: Number(parsed.confidence || 0),
 };
}

function createUnknownPlan() {
  return {
    intent: "unknown",
    category: "",
    items: [],
    reply: "",
    suggestions: [],
    needsClarification: false,
    confidence: 0,
    peopleCount: 0,
  };
}

module.exports = {
  planConversation,
};