const {
  isOrderingIntent,
} = require("../intents/textIntents");


async function handleOrderingIntent({
  message,
  nickname,
  foods,
  drinks,
  modifications,
  openAiKey,
}) {
  if (isOrderingIntent(message)) {
    const parsed = await parseOrderFromMessage({
      apiKey: openAiKey,
      message,
      foods,
      drinks,
      modifications,
    });

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

            const recommendationText = recommendedDrinksByFood.length > 0 ?
                 `\n\nPreporučena pića:\n${recommendedDrinksByFood
                   .map((item) => `- uz ${item.food}: ${item.drinks.join(" ili ")}`)
                   .join("\n")}` :
                     "";
                 const noteText = parsed.items.some((item) => extractNote(item)) ?
                    "\n\nNeslužbene dodatke zapisao sam kao napomenu konobaru." :
                         "";
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

            const unrecognizedText = parsed.unrecognized && parsed.unrecognized.length > 0 ?
  `\n\nNisam prepoznao: ${parsed.unrecognized.join(", ")}. Provjeri naziv artikla ili ga odaberi iz pregleda jelovnika.` :
  "";

            return buildResponse(
                "chat_order_added",
                `${nickname}, dodao sam:\n\n${formattedAddedItems.join("\n\n")}\n\nU pregledu narudžbe uvijek možeš promijeniti količinu ili dodati dodatke/napomenu.${recommendationText}${noteText ? `\n${noteText}` : ""}${unrecognizedText}\n\nŽeliš li još nešto?`,
                parsed.items,
                [
                  ...[...new Set(recommendedDrinksByFood.flatMap((item) => item.drinks))].map((drink) =>
                    buildAction(`pick_menu_item|${drink}|open_menu_browser`, `Dodaj ${drink}`),
                  ),
                  buildAction("go_to_cart", "Završi narudžbu"),
                  buildAction("open_menu_browser", "Dodaj još"),
                  buildAction("open_home", "Početak"),
                ],
            );
          }

          return buildResponse(
              "reply",
              `${nickname}, nisam razumio koje artikle želiš.`,
              [],
              buildMainActions(),
          );
        }
  }

  return null;
}

module.exports = {
  handleOrderingIntent,
};