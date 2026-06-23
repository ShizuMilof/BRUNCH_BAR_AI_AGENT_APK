/* eslint-disable */

const {
  callOpenAI,
} = require("./openai");

async function detectIntentWithAI({
  apiKey,
  message,
}) {
  const prompt = `
Ti si intent classifier za AI konobara.

Vrati SAMO JSON.

Mogući intenti:
- order_history
- order_status
- show_cart
- recommendation
- popular_items
- menu_category_question
- ordering
- finish_order
- small_talk
- unknown

Pravila:
- Ako korisnik pita što je prije naručivao, vrati order_history.
- Ako pita status narudžbe, vrati order_status.
- Ako pita što ima u košarici, vrati show_cart.
- Ako traži preporuku, vrati recommendation.
- Ako pita što je popularno, vrati popular_items.
- Ako pita što ima od deserata, predjela, pizza, sendviča, pića ili neke kategorije, vrati menu_category_question.
- Ako želi dodati/naručiti artikl, vrati ordering.
- Ako želi završiti/poslati narudžbu, vrati finish_order.
- Ako je pozdrav ili mali razgovor, vrati small_talk.
- Ako nisi siguran, vrati unknown.

Vrati oblik:
{
  "intent": "ordering",
  "category": "",
  "confidence": 0.0
}

Primjeri:
Poruka: "kaj sam zadnje jeo"
Odgovor: {"intent":"order_history","category":"","confidence":0.95}

Poruka: "koja je moja povijest naručivanja"
Odgovor: {"intent":"order_history","category":"","confidence":0.95}

Poruka: "što imaš od deserata"
Odgovor: {"intent":"menu_category_question","category":"desert","confidence":0.95}

Poruka: "daj mi jednu koka kolu"
Odgovor: {"intent":"ordering","category":"","confidence":0.95}

Poruka: "predloži mi nešto"
Odgovor: {"intent":"recommendation","category":"","confidence":0.9}

Poruka: "što imaš od predjela"
Odgovor: {"intent":"menu_category_question","category":"predjelo","confidence":0.95}

Poruka: "imaš li sendviče"
Odgovor: {"intent":"menu_category_question","category":"sendvič","confidence":0.95}

Poruka: "koje pizze imate"
Odgovor: {"intent":"menu_category_question","category":"pizza","confidence":0.95}

Poruka:
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

    return {
      intent: parsed.intent || "unknown",
      category: parsed.category || "",
      confidence: Number(parsed.confidence || 0),
    };
  } catch (err) {
    console.error("detectIntentWithAI error:", text);

    return {
      intent: "unknown",
      category: "",
      confidence: 0,
    };
  }
}

module.exports = {
  detectIntentWithAI,
};