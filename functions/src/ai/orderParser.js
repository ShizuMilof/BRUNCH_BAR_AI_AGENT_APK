/* eslint-disable require-jsdoc */
/* eslint-disable */
const {callOpenAI} = require("./openai");
const {normalizeText, fixTypos} = require("../utils/normalize");

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

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}


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


VAŽNO:
- Nemoj stvarati dva ista artikla ako korisnik navodi više okusa, dodataka ili opisa za isti proizvod.
- Ako postoji jedan artikl i više njegovih svojstava povezanih riječju "i", tretiraj to kao JEDAN artikl.
- Službene modifikacije stavi u modifications.
- Neslužbene dodatke, opise ili želje stavi u note.
- Primjer: "sladoled vanilija i kokos odozgora" je jedan SLADOLED, a ne dva SLADOLEDA.
- Primjer: "pizza capricciosa bez gljiva i dobro pečena" je jedna PIZZA CAPRICCIOSA.
- Primjer: "espresso s mlijekom i malo šećera" je jedan ESPRESSO.


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
Poruka: "daj mi sladoled vanilija i kokos odozgora"
Odgovor:
{"items":[{"name":"SLADOLED","quantity":1,"modifications":["VANILIJA"],"note":"kokos odozgora"}]}

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
    const jsonText = start !== -1 && end !== -1 ?
      cleaned.substring(start, end + 1) :
      cleaned;

    const parsed = JSON.parse(jsonText);
    const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
    const availableNames = buildMenuNameSet(foods, drinks);
    const unrecognized = Array.isArray(parsed.unrecognized) ?
  parsed.unrecognized.map((x) => x.toString().trim()).filter(Boolean) :
  [];

    const resolvedFromUnrecognized = resolveUnrecognizedItems(
        unrecognized,
        foods,
        drinks,
    );

    const allParsedItems = [
      ...parsedItems,
      ...resolvedFromUnrecognized,
    ];

    const resolvedOriginalTexts = new Set(
        resolvedFromUnrecognized.map((item) => normalizeText(item.originalText)),
    );

    const finalUnrecognized = unrecognized.filter((item) =>
      !resolvedOriginalTexts.has(normalizeText(item)),
    );
    return {
      unrecognized: finalUnrecognized,
      items: allParsedItems
          .filter((item) => (item && item.name) && availableNames.has(item.name))
          .map((item) => {
            const quantity = Number(item.quantity || 1);

            const officialMods = Object.values(modifications[item.name] || {})
                .map((m) => m.toString().trim());

            const requestedMods = Array.isArray(item.modifications) ?
          item.modifications.map((m) => m.toString().trim()).filter(Boolean) :
          [];

            const validMods = [];
            const invalidMods = [];

            requestedMods.forEach((mod) => {
              const found = officialMods.find((official) =>
                normalizeText(official) === normalizeText(mod),
              );

              if (found) {
                validMods.push(found);
              } else {
                invalidMods.push(mod);
              }
            });

            const noteRaw = typeof item.note === "string" ? item.note.trim() : "";
            const extraNote = invalidMods.length > 0 ?
  invalidMods.join(", ") :
  "";
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
    return {items: [], unrecognized: []};
  }
}


function buildMenuNameSet(foods, drinks) {
  const names = [...foods, ...drinks]
      .map((item) => ((item && item.name) || "").trim())
      .filter(Boolean);

  return new Set(names);
}

function buildMenuParserItems(foods, drinks, modifications = {}) {
  return [...foods, ...drinks]
      .filter((item) => (item && item.name))
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


module.exports = {
  parseOrderFromMessage,
  buildMenuNameSet,
  buildMenuParserItems,
  resolveUnrecognizedItems,
};
