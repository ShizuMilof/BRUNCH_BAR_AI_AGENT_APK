/* eslint-disable */
function extractGeminiText(data) {
  const candidates = data && data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "Nema odgovora od modela.";
  }

  const firstCandidate = candidates[0] || {};
  const content = firstCandidate.content || {};
  const parts = content.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return "Nema odgovora od modela.";
  }

  const text = parts
      .map((p) => (p && typeof p.text === "string" ? p.text : ""))
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


function buildOrdersContext(activeOrder, lastDeliveredOrder) {
  return JSON.stringify(
      {
        trenutnaNarudzba: activeOrder || null,
        proslaNarudzba: lastDeliveredOrder || null,
      },
      null,
      2,
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




module.exports = {
  extractGeminiText,
  formatHistory,
  buildOrdersContext,
  callGemini,
};