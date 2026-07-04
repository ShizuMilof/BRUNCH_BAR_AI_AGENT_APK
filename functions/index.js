/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable no-unused-vars */
const {
    normalizeText,
    normalizeArray,
    filterAvailable,
    sortByName,
} = require("./src/utils/normalize");

const {
    isMealBuilderIntent,
    buildMealSuggestion,
} = require("./src/mealBuilder/mealBuilder");

const {
    isMealBuilderPlanStart,
    createMealBuilderPlan,
    getLastMealBuilderPlan,
    getCurrentMealPart,
    advanceMealBuilderPlan,
    isMealPlanFinished,
    getLastMealBuilderContext,
} = require("./src/mealBuilder/mealBuilderState");

const {
    buildMealPartQuestion,
    getItemsForMealPart,
} = require("./src/mealBuilder/mealBuilderResponses");

const {
    buildAfterOrderSuggestions,
    buildAfterOrderSuggestionsText,
} = require("./src/recommendations/afterOrderSuggestions");

const {
    buildCartBasedSuggestions,
    buildCartBasedSuggestionsText,
} = require("./src/recommendations/cartSuggestions");

const {
    buildPairingRecommendationResponse,
} = require("./src/recommendations/pairingRecommendations");

const {
    isAskingCoffeePairing,
    isAskingLightFood,
    isAskingHealthyFood,
    isHungryIntent,
} = require("./src/intents/contextRecommendationIntents");

const {
    isConfirmSuggestedItemIntent,
    getSuggestedItemIndexFromMessage,
    resolveSuggestedItemFromMessage,
} = require("./src/intents/suggestionIntents");

const {
    getLastSuggestedItems,
} = require("./src/history/suggestionHistory");

const {
    handleOrderingIntent,
} = require("./src/chat/chatOrdering");

const {
    findMenuItemByName,
    findMenuItemFromMessage,
    getRecommendationCategoryFromMessage,
    getRecommendationCategoryLabel,
    getRecommendedItemsByCategory,
    menuItemMatchesRecommendationCategory,
    filterNamesByCategory,
    getItemsByTag
} = require("./src/menu/menuLookup");

const {
    getPopularRecommendationsByCategory,
    getPersonalRecommendationsByCategory,
    getFallbackRecommendationsByCategory,
    getSmartRecommendationsByCategory,
    extractPopularItemNames,
} = require("./src/compose/composeRecommendations");

const {
    isAskingDrinksWithAllergens,
} = require("./src/menu/allergenHelpers");

const {
    isAskingAboutLastOrder,
} = require("./src/history/historyHelpers");

const {
    encodeRepeatItem,
    decodeRepeatItem,
    extractRequestedQuantity,
    replaceItemQuantity,
    isRepeatDisplayedOrderIntent,
    getLastDisplayedOrderItemsFromHistory,
    getLastSelectedRepeatItem,
    isQuantityCorrectionIntent,
} = require("./src/repeat/repeatHelpers");

const {
    getFoodPreferencesFromMessage,
    itemMatchesPreferences,
} = require("./src/compose/composePreferences");

const {
    planConversation,
} = require("./src/ai/conversationPlanner");

const {
    resolveRequestedItems,
} = require("./src/menu/itemResolver");

const {
    parseOrderFromMessage,
    buildMenuNameSet,
} = require("./src/ai/orderParser");

const {
    extractBaseItemName,
    extractNote,
    getOrderItems,
    sortOrdersByCreatedAtDesc,
} = require("./src/orders/orderHelpers");

const {
    buildAction,
    buildMainActions,
    buildDefaultInfoActions,
} = require("./src/responses/actions");

const {
    buildResponse,
    buildHomeResponse,
} = require("./src/responses/builders");

const {
    buildCategoryRecommendations,
    countTopOrderedItems,
    buildPopularItems,
    buildPopularItemsByCategory,
    buildPersonalRecommendations,
    buildFavoritesRecommendations,
    buildSimilarRecommendations,
    buildNewRecommendations,
    getRecommendedDrinksForItems,
    buildFavoritesRecommendationsGrouped,
} = require("./src/menu/recommendations");

const {
    isAskingCart,
    isAskingRecommendations,
    isAskingPopularItems,
    isOrderingIntent,
    isAskingOrderStatus,
    isFollowUpWhichOrder,
    wasLastAssistantAboutOrderStatus,
    isRepeatLastOrderCommand,
    isSmallTalk,
    isFinishOrderIntent,
    isConfirmYes,
    isAskingRecommendedDrinksForFood,
} = require("./src/intents/textIntents");


const {
    centToEur,
    mapRecommendedDrinks,
    buildMenuContext,
    formatContextJson,
    buildAllMenuNames,
    extractExactMenuMatches,
    getActiveAllergens,
} = require("./src/menu/menuHelpers");

const {
    formatOrderItemsShort,
    buildOrderStatusResponse,
    buildOrderSelectionResponse,
    buildSingleOrderStatusResponse,
} = require("./src/orders/orderStatus");

const {
    buildLastAnyOrderResponse,
    buildLastDeliveredOrderResponse,
    buildRepeatLastOrderSubmitResponse,
    buildRepeatLastOrderToCartResponse,
    buildRepeatLastAnyOrderSubmitResponse,
    buildRepeatLastAnyOrderToCartResponse,
    buildOrderHistoryResponse,
    buildHistoryOrderDetailResponse,
} = require("./src/orders/orderHistory");

const {
    buildCartResponse,
} = require("./src/orders/cart");

const {
    buildMenuCategoryActions,
    buildMenuItemActions,
    buildMenuItemConfirmResponse,
} = require("./src/menu/categories");

const {
    buildRecommendationTypeMenuResponse,
    buildRecommendationItemActions,
    buildRecommendationItemActionsWhenChoosingWhatIsPopular,
    buildRecommendationResultResponse,
} = require("./src/menu/recommendationResponses");

const {
    buildRecommendedDrinksForFoodResponse,
    buildDrinksWithAllergensResponse,
    buildCategoryItemsResponse,
} = require("./src/menu/menuResponses");

const {
    formatHistory,
    buildOrdersContext,
} = require("./src/ai/gemini");

const {
    callOpenAI,
} = require("./src/ai/openai");


const {
    planUserRequest,
} = require("./src/ai/requestPlanner");

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function hasNote(items) {
    return items.some((item) => item.includes("NAPOMENA:"));
}

function getRequestedMenuPart(message) {
    const text = normalizeText(message);

    if (text.includes("juhu") || text.includes("juha")) return "juha";
    if (text.includes("pasta") || text.includes("pastu") || text.includes("tjestenina") || text.includes("tijesto")) return "pasta";
if (text.includes("pice") || text.includes("piće") || text.includes("sok") || text.includes("vodu") || text.includes("voda") || text.includes("cola")) return "pice";
if (
    text.includes("glavna") ||
    text.includes("glavno") ||
    text.includes("glavnih")
) return "glavno";

if (
    text.includes("meso") ||
    text.includes("mesno")
) return "meso";
if (text.includes("desert") || text.includes("kolac") || text.includes("kolač") || text.includes("slatko")) return "desert";
    if (text.includes("salata") || text.includes("salatu")) return "salata";
    if (text.includes("pizza") || text.includes("pizzu")) return "pizza";
    if (text.includes("sendvic") || text.includes("sendvič")) return "sendvic";
    if (text.includes("kava") || text.includes("kavu") || text.includes("espresso")) return "kava";
if (
    text.includes("tost") ||
    text.includes("tostove") ||
    text.includes("tostova")
) return "tost";
    return "";
}

function extractQuantity(message) {
    const text = normalizeText(message || "");

    const digitMatch = text.match(/\b([1-9]\d*)\b/);
    if (digitMatch) return Number(digitMatch[1]);

    if (text.includes("jednu") || text.includes("jedan") || text.includes("jedno")) return 1;
    if (text.includes("dvije") || text.includes("dva")) return 2;
    if (text.includes("tri")) return 3;
    if (text.includes("cetiri") || text.includes("četiri")) return 4;
    if (text.includes("pet")) return 5;
    if (text.includes("sest") || text.includes("šest")) return 6;
    if (text.includes("sedam") || text.includes("seedam")) return 7;
    if (text.includes("osam") || text.includes("ossam")) return 8;



    return null;
}

function isAskingItemModifications(message) {
    const text = normalizeText(message || "");

    return (
        text.includes("od cega") ||
        text.includes("od cega imas") ||
        text.includes("od čega imaš") ||
        text.includes("od čega") ||
        text.includes("s cim") ||
        text.includes("s čim") ||
        text.includes("sa cim") ||
        text.includes("sa čim") ||
        text.includes("koje okuse") ||
        text.includes("kakve okuse") ||
        text.includes("koji okusi") ||
        text.includes("kakvi okusi") ||
        text.includes("koje imas okuse") ||
        text.includes("koje imaš okuse") ||
        text.includes("koji su okusi") ||
        text.includes("ima okusa") ||
        text.includes("kakvih ima") ||
        text.includes("kakav ima") ||
        text.includes("koje dodatke") ||
        text.includes("kakve dodatke") ||
        text.includes("s kojim dodacima") ||
        text.includes("kakve priloge") ||
        text.includes("koje priloge") ||
        text.includes("koje modifikacije") ||
        text.includes("sto mogu dodati") ||
        text.includes("što mogu dodati") ||
        text.includes("sta mogu dodati") ||
        text.includes("šta mogu dodati")
    );
}

function getModificationOptionsForItem(itemName, modifications) {
    const mods = modifications[itemName] || {};

    return Object.values(mods)
        .map((mod) => mod && mod.toString().trim())
        .filter(Boolean);
}

function getDrinkTypeFromMessage(message) {
    const text = normalizeText(message);

    if (text.includes("sok")) return "sok";
    if (text.includes("gaz")) return "gazirano";
    if (text.includes("voda")) return "voda";
    if (text.includes("kava")) return "kava";
    if (text.includes("caj") || text.includes("čaj")) return "caj";

    return "";
}

function buildStrictOrderingHelpResponse(nickname) {
    return buildResponse(
        "reply",
        `${nickname}, za dodavanje artikala u narudžbu koristi pregled jelovnika. U chatu ti mogu pomoći s informacijama o jelovniku, alergenima, cijenama i preporukama.`,
        [],
        buildMainActions(),
    );
}



function getRecommendationGroup(item) {
    const category = normalizeText((item && item.category) || "");

    if (
        category.includes("tost") ||
        category.includes("salata") ||
        category.includes("vege")
    ) {
        return "Od predjela";
    }

    if (
        category.includes("pizza") ||
        category.includes("tijesto") ||
        category.includes("sendvic") ||
        category.includes("sendvič")
    ) {
        return "Od glavnog jela";
    }

    if (category.includes("desert")) {
        return "Od deserta";
    }

    if (
        category.includes("sok") ||
        category.includes("kava") ||
        category.includes("caj") ||
        category.includes("čaj") ||
        category.includes("pice") ||
        category.includes("piće")
    ) {
        return "Od pića";
    }

    return "Još bih izdvojio";
}

function getPopularCategoryFromMessage(message) {
    const text = normalizeText(message);

    if (text.includes("desert") || text.includes("kolac") || text.includes("kolač")) return "desert";
    if (text.includes("pizza") || text.includes("pizze")) return "pizza";
    if (text.includes("sendvic") || text.includes("sendvič")) return "sendvic";
    if (text.includes("salata")) return "salata";
    if (text.includes("pasta") || text.includes("tjestenina") || text.includes("tijesto")) return "tijesto";
    if (text.includes("pice") || text.includes("piće") || text.includes("sok") || text.includes("kava")) return "pice";

    return "";
}

function buildGroupedRecommendationText(nickname, itemNames, foods, drinks) {
    if (!itemNames || itemNames.length === 0) {
        return `${nickname}, još nemam dovoljno tvojih prošlih dostavljenih narudžbi za osobnu preporuku.`;
    }

    const groups = {};

    itemNames.forEach((name) => {
        const menuItem = findMenuItemByName(name, foods, drinks);
        const group = getRecommendationGroup(menuItem);

        if (!groups[group]) {
            groups[group] = [];
        }

        groups[group].push(name);
    });

    const preferredOrder = [
        "Od predjela",
        "Od glavnog jela",
        "Od deserta",
        "Od pića",
        "Još bih izdvojio",
    ];

    const sections = preferredOrder
        .filter((group) => groups[group] && groups[group].length > 0)
        .map((group) => `${group} ti predlažem:\n${groups[group].map((item) => `- ${item}`).join("\n")}`);

    return `${nickname}, po tvojim prošlim narudžbama mogu ti preporučiti:\n\n${sections.join("\n\n")}`;
}


function pickItemForComposeRequest(requestedName, foods, drinks) {
    const text = normalizeText(requestedName);
    const menu = [].concat(foods || [], drinks || []);

    const rules = [
        { match: ["juha", "juhu"], categories: ["juha"] },
        { match: ["predjelo", "predjela"], categories: ["predjelo", "tost", "salata"] },
        { match: ["glavno", "glavno jelo", "glavna jela", "meso", "mesno"], categories: ["glavno", "meso"] },
        { match: ["pasta", "pašta", "tjestenina"], categories: ["pasta", "tjestenina", "tijesto"] },
        { match: ["pizza", "pizzu"], categories: ["pizza"] },
        { match: ["sendvic", "sendvič"], categories: ["sendvic", "sendvič"] },
        { match: ["salata", "salatu"], categories: ["salata"] },
        { match: ["desert", "deserta", "kolac", "kolač"], categories: ["desert", "kolac", "kolač"] },
        { match: ["pice", "piće", "piti", "sok", "kava"], categories: ["pice", "piće", "sok", "kava"] },
    ];

    const rule = rules.find((r) =>
        r.match.some((word) => text.includes(normalizeText(word))),
    );

    if (!rule) return [];

    return menu.filter((item) => {
        const category = normalizeText(item.category || "");
        const name = normalizeText(item.name || "");
        const mealRole = normalizeText(item.mealRole || "");

        return rule.categories.some((wanted) => {
            const wantedText = normalizeText(wanted);

            return (
                category.includes(wantedText) ||
                name.includes(wantedText) ||
                mealRole.includes(wantedText)
            );
        });
    });
}


exports.chatWaiter = onCall(
    {
        region: "europe-west1",
        secrets: [GEMINI_API_KEY, OPENAI_API_KEY],
    },
    async (request) => {
        console.log("EMULATOR HIT chatWaiter");
        console.log("REQUEST DATA:", JSON.stringify(request.data || {}));
        console.log("TEST VERSION 123 MOD CHECK ACTIVE");

        try {
            const data = request.data || {};
            const message = (data.message || "").trim();
            const action = (data.action || "").trim();
            const mode = (data.mode || "").trim();
            const userId = (data.userId || "").trim();
            const nickname = (data.nickname || "Gost").trim();
            const history = Array.isArray(data.history) ? data.history : [];
            const shortHistory = history.slice(-8);
            const cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];
            const historyText = formatHistory(shortHistory);
            const isNewChatSession =
                history.length === 0 ||
                message === "Novi razgovor" ||
                action === "new_chat";

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
                .map(([key, value]) => ({ key, ...value }))
                .filter(Boolean);
            const userOrders = userId ?
                allOrders.filter((order) => order && order.userId === userId) :
                [];

            const activeOrders = sortOrdersByCreatedAtDesc(
                userOrders.filter((order) => {
                    const status = normalizeText((order && order.status) || "");
                    return status !== normalizeText("Dostavljeno") &&
                        status !== normalizeText("Otkazano");
                }),
            );

            const activeOrder = activeOrders[0] || null;

            // --- ZADNJA DOSTAVLJENA ---
            const completedOrders = sortOrdersByCreatedAtDesc(
                userOrders.filter((order) =>
                    normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
                ),
            );

            const lastDeliveredOrder = completedOrders[0] || null;
            const lastDeliveredOrderItems = getOrderItems(lastDeliveredOrder);
            const allUserOrdersSorted = sortOrdersByCreatedAtDesc(userOrders);
            const lastAnyOrder = allUserOrdersSorted[0] || null;
            const lastAnyOrderItems = getOrderItems(lastAnyOrder);

            const menuContext = {
                foods,
                drinks,
            };
            if (mode === "new_order" && !action && message === "Htio bih nešto naručiti") {
                return buildResponse(
                    "new_order_mode",
                    `${nickname}, super. Napiši što bi htio naručiti, npr. "složi mi ručak za 2 osobe" ili "htio bih juhu, paštu i meso".`,
                    [],
                    buildHomeResponse(nickname).actions,
                    { mode: "new_order" },
                );
            }

            if (mode === "order_history" && !action && message === "Moje prethodne narudžbe") {
                return buildOrderHistoryResponse(nickname, userOrders);
            }

            if (mode === "popular" && !action && message === "Što je popularno") {
                const items = buildPopularItems(allOrders, foods, drinks, 3);
                const popularItemNames = extractPopularItemNames(items);

                return buildResponse(
                    "popular_items",
                    items.length > 0 ?
                        `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                        `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
                    popularItemNames,
                    popularItemNames.length > 0 ?
                        buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular") :
                        buildHomeResponse(nickname).actions,
                );
            }

            if (message && !action && isSmallTalk(message)) {
                return buildResponse(
                    "reply",
                    `${nickname}, bok. Mogu ti pomoći s jelovnikom, cijenama, alergenima, preporukama, košaricom i narudžbom. Samo napiši što želiš.`,
                    [],
                    [],
                );
            }


            if (message && !action && isMealBuilderPlanStart(message)) {
                const plan = createMealBuilderPlan(message);
                const part = getCurrentMealPart(plan);

                if (part) {
                    return buildMealPartQuestion({
                        nickname,
                        part,
                        foods,
                        plan,
                        buildResponse,
                        drinks,
                    });
                }
            }

            const mealContext = getLastMealBuilderContext(history);


            console.log("BEFORE MOD CHECK:", message);

            if (message && !action && isAskingItemModifications(message)) {
                console.log("MOD QUESTION HIT:", message);

               const menu = [].concat(foods || [], drinks || []);

               const item = menu.find((menuItem) => {
                   const itemName = normalizeText(menuItem.name || "");
                   const aliases = Array.isArray(menuItem.aliasi) ? menuItem.aliasi : [];

                   return (
                       itemName && normalizeText(message).includes(itemName)
                   ) || aliases.some((alias) =>
                       normalizeText(message).includes(normalizeText(alias)),
                   );
               });

                console.log("MOD ITEM FOUND:", item && item.name);

                if (item) {
                    const options = getModificationOptionsForItem(item.name, modifications);

                    console.log("MOD OPTIONS:", JSON.stringify(options));

                    if (options.length > 0) {
                        return buildResponse(
                            "item_modifications",
                            `${nickname}, za ${item.name} mogu ponuditi:\n\n${options
                                .map((option) => `- ${option}`)
                                .join("\n")}`,
                            options,
                            [],
                            {
                                lastSuggestedItems: [item.name],
                            },
                        );
                    }
                }
            }

            if (
                message &&
                !action &&
                mealContext.plan &&
                mealContext.currentItem &&
                isConfirmSuggestedItemIntent(message)) {
                const itemName = mealContext.currentItem;

                const nextPlan = advanceMealBuilderPlan(mealContext.plan, {
                    selectedItem: `${itemName}(X1)`,
                    setIndex: Number(mealContext.plan.currentIndex || 0) + 1,
                });

                const nextPart = getCurrentMealPart(nextPlan);

                if (!nextPart) {
                    return buildResponse(
                        "chat_order_added",
                        `${nickname}, dodao sam ${itemName}.\n\nTo je sve što smo planirali. Želiš li još nešto?`,
                        [`${itemName}(X1)`],
                        [buildAction("go_to_cart", "Završi narudžbu")],
                       {
                           mealBuilderPlan: null,
                           mealBuilderCurrentPart: null,
                           mealBuilderCurrentItem: null,
                           lastSuggestedItems: [],
                       },
                    );
                }
                console.log("MEAL BUILDER NEXT PART:", nextPart);
                const nextItems = getItemsForMealPart(nextPart, foods, drinks);
                const offered = nextItems.slice(0, 5).map((item) => item.name);

                return buildResponse(
                    "chat_order_added",
                    `${nickname}, dodao sam ${itemName}.\n\nSada idemo na ${nextPart}. Mogu ponuditi:\n\n${offered
                        .map((name) => `- ${name}`)
                        .join("\n")}\n\nKoju želiš?`,
                    [`${itemName}(X1)`],
                    [buildAction("go_to_cart", "Završi narudžbu")],
                    {
                        mealBuilderPlan: nextPlan,
                        lastSuggestedItems: offered,
                        mealBuilderCurrentPart: nextPart,
                    },
                );

            }

const normalizedMealAnswer = normalizeText(message);

if (
  message &&
  !action &&
  mealContext.plan &&
  mealContext.currentPart &&
  (
    normalizedMealAnswer === "ne" ||
    normalizedMealAnswer === "nemoj" ||
    normalizedMealAnswer === "preskoci" ||
    normalizedMealAnswer === "preskoci" ||
    normalizedMealAnswer.includes("necu") ||
    normalizedMealAnswer.includes("nijednu") ||
    normalizedMealAnswer.includes("nista") ||
    normalizedMealAnswer.includes("ne zelim") ||
    normalizedMealAnswer.includes("ne želim")
  )
) {
                const nextPlan = advanceMealBuilderPlan(mealContext.plan, {
                    skippedPart: mealContext.currentPart,
                    setIndex: Number(mealContext.plan.currentIndex || 0) + 1,
                });

                const nextPart = getCurrentMealPart(nextPlan);

                if (!nextPart) {
                    return buildResponse(
                        "meal_builder_finished",
                        `${nickname}, u redu, preskočili smo ${mealContext.currentPart}. To je sve iz plana. Želiš li još nešto?`,
                        [],
                        [],
                       {
                         mealBuilderPlan: null,
                         mealBuilderCurrentPart: null,
                         mealBuilderCurrentItem: null,
                         lastSuggestedItems: [],
                       }
                    );
                }

                console.log("MEAL BUILDER NEXT PART:", nextPart);
                const nextItems = getItemsForMealPart(nextPart, foods, drinks);
                const offered = nextItems.slice(0, 5).map((item) => item.name);

            return buildResponse(
                "meal_builder_step",
                `${nickname}, u redu.\n\nSada idemo na ${nextPart}. Mogu ponuditi:\n\n${offered
                    .map((name) => `- ${name}`)
                    .join("\n")}\n\nKoju želiš?`,
                [],
                [],
                {
                    mealBuilderPlan: nextPlan,
                    lastSuggestedItems: offered,
                    mealBuilderCurrentPart: nextPart,
                },
            );
            }




       const lastAssistant = [...history]
           .reverse()
           .find((item) =>
               item &&
               (item.role === "assistant" || item.sender === "assistant")
           );

         const pendingSuggestedQuantity =
             lastAssistant &&
             lastAssistant.metadata &&
             lastAssistant.metadata.pendingSuggestedQuantity ?
                 lastAssistant.metadata.pendingSuggestedQuantity :
                 1;

         const shouldAskQuantityAfterSuggestion =
             lastAssistant &&
             lastAssistant.metadata &&
             lastAssistant.metadata.shouldAskQuantityAfterSuggestion === true;




            const lastSuggestedItems = getLastSuggestedItems(history);
            const isNewRecommendationRequest =
                message &&
                !action &&
                isAskingRecommendations(message);

            const isNewPopularRequest =
                message &&
                !action &&
                isAskingPopularItems(message);

            const isNewMenuBrowseRequest =
                message &&
                !action &&
                (
                    normalizeText(message).includes("sta imas") ||
                    normalizeText(message).includes("što imaš") ||
                    normalizeText(message).includes("sto imas") ||
                    normalizeText(message).includes("koje imas") ||
                    normalizeText(message).includes("koje imaš") ||
                    normalizeText(message).includes("pokazi") ||
                    normalizeText(message).includes("pokaži")
                );

            const shouldIgnoreOldSuggestions =
                isNewRecommendationRequest ||
                isNewPopularRequest ||
                isNewMenuBrowseRequest;
            console.log("SUGGESTION BLOCK CHECK");
            console.log("MESSAGE:", message);
            console.log("ACTION:", action);
            console.log("LAST ITEMS:", JSON.stringify(lastSuggestedItems));
            console.log(
                "IS_CONFIRM:",
                isConfirmSuggestedItemIntent(message),
            );
            console.log("LAST SUGGESTED ITEMS:", JSON.stringify(lastSuggestedItems));
            console.log("CONFIRM SUGGESTION:", isConfirmSuggestedItemIntent(message));
            console.log("MESSAGE:", message);

          if (
              message &&
              !action &&
              !mealContext.plan &&
              lastSuggestedItems.length > 0 &&
              !shouldIgnoreOldSuggestions &&
              isConfirmSuggestedItemIntent(message)
          ) {
                console.log("SUGGESTION ACCEPTED");
                const firstItem = lastSuggestedItems[0];

               return buildResponse(
                   "ask_quantity",
                   `${nickname}, koliko komada želiš za ${firstItem}?`,
                   [],
                   [],
                   {
                       pendingQuantityItem: firstItem,
                       lastSuggestedItems: [],
                   },
               );
            }

            const suggestedIndex = getSuggestedItemIndexFromMessage(message);

            if (
                message &&
                !action &&
                !isAskingRecommendations(message) &&
                lastSuggestedItems.length > 0 &&
                !shouldIgnoreOldSuggestions &&
                suggestedIndex >= 0 &&
                lastSuggestedItems[suggestedIndex]
            ) {
                const itemName = lastSuggestedItems[suggestedIndex];
                if (mealContext.plan && mealContext.currentPart) {
                    const nextPlan = advanceMealBuilderPlan(mealContext.plan, {
                        selectedItem: `${itemName}(X1)`,
                        setIndex: Number(mealContext.plan.currentIndex || 0) + 1,
                    });

                    const nextPart = getCurrentMealPart(nextPlan);

                   if (!nextPart) {
                       return buildResponse(
                           "chat_order_added",
                           `${nickname}, dodao sam ${itemName}.\n\nTo je sve što smo planirali. Želiš li još nešto?`,
                           [`${itemName}(X1)`],
                           [buildAction("go_to_cart", "Završi narudžbu")],
                           {
                               mealBuilderPlan: null,
                               mealBuilderCurrentPart: null,
                               mealBuilderCurrentItem: null,
                               lastSuggestedItems: [],
                           },
                       );
                   }
                    console.log("MEAL BUILDER NEXT PART:", nextPart);
                    const nextItems = getItemsForMealPart(nextPart, foods, drinks);
                    const offered = nextItems.slice(0, 5).map((item) => item.name);

                    return buildResponse(
                        "chat_order_added",
                        `${nickname}, dodao sam ${itemName}.\n\nSada idemo na ${nextPart}. Mogu ponuditi:\n\n${offered
                            .map((name) => `- ${name}`)
                            .join("\n")}\n\nKoju želiš?`,
                        [`${itemName}(X1)`],
                        [buildAction("go_to_cart", "Završi narudžbu")],
                        {
                            mealBuilderPlan: nextPlan,
                            lastSuggestedItems: offered,
                            mealBuilderCurrentPart: nextPart,
                        },
                    );
                }

              return buildResponse(
                  "ask_quantity",
                  `${nickname}, koliko komada želiš za ${itemName}?`,
                  [],
                  [],
                  {
                      pendingQuantityItem: itemName,
                      pendingSuggestedQuantity: null,
                      lastSuggestedItems: [],
                  },
              );
            }


            const suggestedItemFromText = resolveSuggestedItemFromMessage(
                message,
                lastSuggestedItems,
            );



          const wantsRecommendationsFromHistory =
              normalizedMealAnswer.includes("proslim narudzbama") ||
              normalizedMealAnswer.includes("prošlim narudžbama") ||
              normalizedMealAnswer.includes("prethodnim narudzbama") ||
              normalizedMealAnswer.includes("prethodnim narudžbama") ||
              normalizedMealAnswer.includes("prethodne narudzbe") ||
              normalizedMealAnswer.includes("prethodne narudžbe") ||
              normalizedMealAnswer.includes("prema proslim") ||
              normalizedMealAnswer.includes("prema prošlim") ||
              normalizedMealAnswer.includes("prema prethodnim") ||
              normalizedMealAnswer.includes("po proslim") ||
              normalizedMealAnswer.includes("po prošlim") ||
              normalizedMealAnswer.includes("po prethodnim") ||
              normalizedMealAnswer.includes("mojim narudzbama") ||
              normalizedMealAnswer.includes("mojim narudžbama") ||
              normalizedMealAnswer.includes("po mom ukusu");

            if (message && !action && wantsRecommendationsFromHistory) {
                const grouped = buildFavoritesRecommendationsGrouped(
                    userOrders,
                    foods,
                    drinks,
                );


                const sections = [];

                if (grouped.predjelo.length) {
                    sections.push(`Od predjela ti predlažem:\n- ${grouped.predjelo[0]}`);
                }

                if (grouped.glavno.length) {
                    sections.push(`Od glavnog jela ti predlažem:\n- ${grouped.glavno[0]}`);
                }

                if (grouped.desert.length) {
                    sections.push(`Od deserta ti predlažem:\n- ${grouped.desert[0]}`);
                }

                if (grouped.pice.length) {
                    sections.push(`Od pića ti predlažem:\n- ${grouped.pice[0]}`);
                }

                const suggestedItems = [
                    grouped.predjelo[0],
                    grouped.glavno[0],
                    grouped.desert[0],
                    grouped.pice[0],
                ].filter(Boolean);

              return buildResponse(
                  "personal_recommendations",
                  suggestedItems.length > 0 ?
                      `${nickname}, po tvojim prošlim narudžbama mogu ti preporučiti:\n\n${sections.join("\n\n")}` :
                      `${nickname}, još nemam dovoljno tvojih prošlih dostavljenih narudžbi za osobnu preporuku.`,
                  suggestedItems,
                  [],
                  {
                      lastSuggestedItems: suggestedItems,
                  },
              );
            }


       const pendingQuantityItem =
           lastAssistant &&
           lastAssistant.metadata &&
           lastAssistant.metadata.pendingQuantityItem ?
               lastAssistant.metadata.pendingQuantityItem :
               "";

       const pendingQuantityItems =
           lastAssistant &&
           lastAssistant.metadata &&
           Array.isArray(lastAssistant.metadata.pendingQuantityItems) ?
               lastAssistant.metadata.pendingQuantityItems :
               [];

       if (
           message &&
           !action &&
           (pendingQuantityItem || pendingQuantityItems.length > 0)
       ) {

       const pendingCancelText = normalizeText(message);

       if (
           pendingCancelText === "ne" ||
           pendingCancelText === "necu" ||
           pendingCancelText === "neću" ||
           pendingCancelText.includes("ne zelim") ||
           pendingCancelText.includes("ne želim") ||
           pendingCancelText.includes("odustani") ||
           pendingCancelText.includes("prekini") ||
           isAskingRecommendations(message) ||
           isAskingPopularItems(message) ||
           isAskingCart(message)
       ) {
           return buildResponse(
               "flow_cancelled",
               `${nickname}, u redu, neću dodati taj artikl. Što želiš dalje?`,
               [],
               [],
               {
                   pendingQuantityItem: null,
                   pendingQuantityItems: [],
                   lastSuggestedItems: [],
                   shouldAskQuantityAfterSuggestion: false,
               },
           );
       }


           const quantity = extractQuantity(message);

           const currentPendingItem = pendingQuantityItems.length > 0 ?
               pendingQuantityItems[0] :
               pendingQuantityItem;

           const remainingItems = pendingQuantityItems.length > 0 ?
               pendingQuantityItems.slice(1) :
               [];

           if (quantity) {
               const addedItem = `${currentPendingItem}(X${quantity})`;

               if (remainingItems.length > 0) {
                   return buildResponse(
                       "chat_order_added",
                       `${nickname}, dodao sam:\n\n- ${currentPendingItem}${quantity > 1 ? ` x${quantity}` : ""}\n\nKoliko komada želiš za ${remainingItems[0]}?`,
                       [addedItem],
                       [],
                       {
                           pendingQuantityItems: remainingItems,
                           pendingQuantityItem: null,
                           lastSuggestedItems: [],
                       },
                   );
               }

               return buildResponse(
                   "chat_order_added",
                   `${nickname}, dodao sam:\n\n- ${currentPendingItem}${quantity > 1 ? ` x${quantity}` : ""}\n\nŽeliš li još nešto?`,
                   [addedItem],
                   [buildAction("go_to_cart", "Završi narudžbu")],
                   {
                       pendingQuantityItems: [],
                       pendingQuantityItem: null,
                       lastSuggestedItems: [],
                   },
               );
           }

          return buildResponse(
              "ask_quantity",
              `${nickname}, trenutno biramo količinu za ${currentPendingItem}.\n\nNapiši broj komada, npr. 1, 2 ili 3.\n\nAko ne želiš nastaviti s ovim artiklom, napiši "odustani", "prekini" ili "ne želim".`,
              [],
              [],
              {
                  pendingQuantityItems: pendingQuantityItems.length > 0 ?
                      pendingQuantityItems :
                      [pendingQuantityItem],
                  pendingQuantityItem: null,
                  lastSuggestedItems: [],
              },
          );
       }

            const requestedMenuPart = getRequestedMenuPart(message);


            const genericCategoryWords = [
                "zelim", "želim", "daj", "dodaj", "mi", "molim", "hocu", "hoću",
                "pizzu", "pizza", "pizze",
                "sendvic", "sendvič", "sendvica", "sendviča",
                "desert", "deserta",
                "salatu", "salata",
                "kavu", "kava",
                "meso", "mesno", "glavno",
                "sok", "pice", "piće",
                "tost", "tostove", "tostova",
            ];

            const isGenericCategoryRequest =
                requestedMenuPart &&
                normalizeText(message)
                    .split(/\s+/)
                    .filter((word) => word.length > 2)
                    .every((word) => genericCategoryWords.includes(word));

            if (
                message &&
                !action &&
                requestedMenuPart &&
                isGenericCategoryRequest &&
                !mealContext.plan
            ) {
                const items = getItemsForMealPart(
                    requestedMenuPart,
                    foods,
                    drinks,
                );

                const offered = items
                    .slice(0, 5)
                    .map((item) => item.name);

                if (offered.length > 0) {
                    return buildResponse(
                        "category_offer",
                        `${nickname}, prvo odaberi ${requestedMenuPart} koju želiš:\n\n${offered
                             .map((name) => `- ${name}`)
                             .join("\n")}\n\nNakon toga ćemo definirati količinu.`,
                        [],
                        [],


                      {
                          lastSuggestedItems: offered,
                      }
                    );
                }
            }

            function findMenuItemsFromMessage(message, foods, drinks) {
              const text = normalizeText(message || "");
              const menu = [].concat(foods || [], drinks || []);

              return menu.filter((item) => {
                const name = normalizeText(item.name || "");

                if (!name) return false;

                const words = name
                    .split(/\s+/)
                    .filter((word) => word.length > 2);

                const matches = words.filter((word) =>
                  text.includes(word),
                );

                return matches.length >= Math.max(1, words.length - 1);
              });
            }

            function findMenuItemsFromMessageParts(message, foods, drinks) {
                const parts = normalizeText(message || "")
                    .split(/\s+i\s+|,|;/)
                    .map((part) => part.trim())
                    .filter(Boolean);

                const items = [];

                parts.forEach((part) => {
                    const item = findMenuItemFromMessage(part, foods, drinks);

                    if (
                        item &&
                        !items.some((existing) =>
                            normalizeText(existing.name) === normalizeText(item.name),
                        )
                    ) {
                        items.push(item);
                    }
                });

                return items;
            }

            if (
                message &&
                !action &&
                mealContext.plan &&
                mealContext.currentPart &&
                lastSuggestedItems.length > 0
            ) {
                const mealBuilderItem = resolveSuggestedItemFromMessage(
                    message,
                    lastSuggestedItems,
                );

                if (mealBuilderItem) {
                    const nextPlan = advanceMealBuilderPlan(mealContext.plan, {
                        selectedItem: `${mealBuilderItem}(X1)`,
                        setIndex: Number(mealContext.plan.currentIndex || 0) + 1,
                    });

                    const nextPart = getCurrentMealPart(nextPlan);

                    if (!nextPart) {
                        return buildResponse(
                            "chat_order_added",
                            `${nickname}, dodao sam ${mealBuilderItem}.\n\nTo je sve što smo planirali. Želiš li još nešto?`,
                            [`${mealBuilderItem}(X1)`],
                            [buildAction("go_to_cart", "Završi narudžbu")],
                            {
                                mealBuilderPlan: null,
                                mealBuilderCurrentPart: null,
                                mealBuilderCurrentItem: null,
                                lastSuggestedItems: [],
                            },
                        );
                    }

                    const nextItems = getItemsForMealPart(nextPart, foods, drinks);
                    const offered = nextItems.slice(0, 5).map((item) => item.name);

                    return buildResponse(
                        "chat_order_added",
                        `${nickname}, dodao sam ${mealBuilderItem}.\n\nSada idemo na ${nextPart}. Mogu ponuditi:\n\n${offered
                            .map((name) => `- ${name}`)
                            .join("\n")}\n\nKoju želiš?`,
                        [`${mealBuilderItem}(X1)`],
                        [],
                        {
                            mealBuilderPlan: nextPlan,
                            lastSuggestedItems: offered,
                            mealBuilderCurrentPart: nextPart,
                            mealBuilderCurrentItem: null,
                        },
                    );
                }
            }

          const exactMenuItems = findMenuItemsFromMessageParts(
              message,
              foods,
              drinks,
          );

       if (
           message &&
           !action &&
           exactMenuItems.length > 1 &&
           !mealContext.plan &&
           !isGenericCategoryRequest
       ) {
           console.log(
               "EXACT MENU ITEMS:",
               exactMenuItems.map((item) => item.name)
           );

           const itemNames = exactMenuItems.map((item) => item.name);

           return buildResponse(
               "ask_quantity",
               `${nickname}, koliko komada želiš za ${itemNames[0]}?`,
                [],
                [],
                {
                    pendingQuantityItems: itemNames,
                    lastSuggestedItems: [],
                },
            );
        }

if (
                message &&
                !action &&
                !isAskingRecommendations(message) &&
                lastSuggestedItems.length > 0 &&
                !shouldIgnoreOldSuggestions &&
                suggestedItemFromText
              ) {
               if (mealContext.plan && mealContext.currentPart) {
                   const note = extractNote(message);

                   const selectedTextItem = note ?
                       `${suggestedItemFromText}\n\nNAPOMENA: ${note} (X1)` :
                       `${suggestedItemFromText}(X1)`;

                   const displayItem = note ?
                       `${suggestedItemFromText} (${note})` :
                       suggestedItemFromText;

                   const nextPlan = advanceMealBuilderPlan(mealContext.plan, {
                       selectedItem: selectedTextItem,
                       setIndex: Number(mealContext.plan.currentIndex || 0) + 1,
                   });

                    const nextPart = getCurrentMealPart(nextPlan);

                    if (!nextPart) {
                        return buildResponse(
                            "chat_order_added",
                            `${nickname}, dodao sam ${displayItem}.\n\nTo je sve što smo planirali. Želiš li još nešto?`,
                            [selectedTextItem],
                            [buildAction("go_to_cart", "Završi narudžbu")],
                          {
                            mealBuilderPlan: null,
                            mealBuilderCurrentPart: null,
                            mealBuilderCurrentItem: null,
                            lastSuggestedItems: [],
                          },
                        );
                    }

                    const nextItems = getItemsForMealPart(nextPart, foods, drinks);
                    const offered = nextItems.slice(0, 5).map((item) => item.name);

                    return buildResponse(
                        "chat_order_added",
                        `${nickname}, dodao sam ${displayItem}.\n\nSada idemo na ${nextPart}. Mogu ponuditi:\n\n${offered
                            .map((name) => `- ${name}`)
                            .join("\n")}\n\nKoju želiš?`,
                       [selectedTextItem],
                        [buildAction("go_to_cart", "Završi narudžbu")],
                        {
                            mealBuilderPlan: nextPlan,
                            lastSuggestedItems: offered,
                            mealBuilderCurrentPart: nextPart,
                        },
                    );
                }

           return buildResponse(
               "ask_quantity",
               `${nickname}, koliko komada želiš za ${suggestedItemFromText}?`,
               [],
               [],
               {
                   pendingQuantityItem: suggestedItemFromText,
                   lastSuggestedItems: [],
               },
           );
            }

       const normalizedForParser = normalizeText(message);

      const shouldTryOrderParser =
          message &&
          !action &&
          !mealContext.plan &&
          !isGenericCategoryRequest &&
          !isAskingRecommendations(message) &&
          !isAskingPopularItems(message) &&
          !isAskingCart(message) &&
          !isAskingOrderStatus(message) &&
          !isFinishOrderIntent(message) &&
          (
              extractQuantity(message) ||
              normalizedForParser.includes(" bez ") ||
              normalizedForParser.includes(" sa ") ||
              normalizedForParser.includes(" s ") ||
              normalizedForParser.includes(" za van") ||
              normalizedForParser.includes(" i ")
          );


        console.log("BEFORE PARSER CHECK:", message);
        console.log("SHOULD TRY PARSER:", shouldTryOrderParser);
        console.log("NORMALIZED FOR PARSER:", normalizedForParser);
       if (shouldTryOrderParser) {
           const parsedOrder = await parseOrderFromMessage({
               apiKey: openAiKey,
               message,
               foods,
               drinks,
               modifications,
           });

           if (
               parsedOrder &&
               Array.isArray(parsedOrder.items) &&
               parsedOrder.items.length > 0
           ) {
               return buildResponse(
                   "chat_order_added",
                  `${nickname}, dodao sam:\n\n${parsedOrder.items
                      .map((item) => `- ${item
                          .replace(/\(X\d+\)/i, "")
                          .trim()
                          .split("\n")
                          .map((line, index) => index === 0 ? line : `  ${line}`)
                          .join("\n")}`)
                      .join("\n\n")}\n\nŽeliš li još nešto?`,
                   parsedOrder.items,
                   [buildAction("go_to_cart", "Završi narudžbu")],
                   {
                       lastSuggestedItems: [],
                       pendingQuantityItem: null,
                       pendingQuantityItems: [],
                   },
               );
           }
       }

       const isItemInfoQuestion =
           normalizeText(message).includes("sto je") ||
           normalizeText(message).includes("što je") ||
           normalizeText(message).includes("sta je") ||
           normalizeText(message).includes("šta je") ||
           normalizeText(message).includes("sta je to") ||
           normalizeText(message).includes("šta je to") ||
           normalizeText(message).includes("koji su sastojci") ||
           normalizeText(message).includes("sastojci") ||
           normalizeText(message).includes("objasni") ||
           normalizeText(message).includes("kakav je") ||
           normalizeText(message).includes("opis");


        const exactMenuItem = findMenuItemFromMessage(
            message,
            foods,
            drinks,
        );

        console.log(
            "EXACT ITEM FLOW:",
            exactMenuItem ? exactMenuItem.name : null
        );

      if (
          message &&
          !action &&
          exactMenuItem &&
          !mealContext.plan &&
          !isGenericCategoryRequest &&
          !isItemInfoQuestion
      ) {
             const quantity = extractQuantity(message);

             if (!quantity) {
                 return buildResponse(
                     "ask_quantity",
                     `${nickname}, koliko ${exactMenuItem.name} želiš?`,
                     [],
                     [],
                     {
                         pendingQuantityItem: exactMenuItem.name,
                         lastSuggestedItems: [],
                     },
                 );
             }

             const addedItems = [`${exactMenuItem.name}(X${quantity})`];

             const cartSuggestions = buildCartBasedSuggestions({
                 cartItems,
                 addedItems,
                 foods,
                 drinks,
             });

             const suggestionText = buildCartBasedSuggestionsText(cartSuggestions);

             return buildResponse(
                 "chat_order_added",
                 `${nickname}, dodao sam:\n\n- ${exactMenuItem.name}${quantity > 1 ? ` x${quantity}` : ""}${suggestionText}\n\nŽeliš li još nešto?`,
                 addedItems,
                 [buildAction("go_to_cart", "Završi narudžbu")],
                 {
                     lastSuggestedItems: cartSuggestions,
                 },
             );
         }


             const conversationPlan = message && !action ?
                await planConversation({
                    apiKey: openAiKey,
                    message,
                    menuContext,
                    cartItems,
                    historyText,
                }) :
                {
                    intent: "unknown",
                    category: "",
                    items: [],
                    reply: "",
                    suggestions: [],
                    needsClarification: false,
                    confidence: 0,
                };

            console.log("CONVERSATION PLAN:", JSON.stringify(conversationPlan));

            const requestPlan = {
                intent: "unknown",
                category: "",
                items: [],
                needsClarification: false,
                clarificationQuestion: "",
                confidence: 0,
            };

            if (message && !action && isRepeatDisplayedOrderIntent(message)) {
                const assistantMessages = history
                    .filter((item) =>
                        item.role === "assistant" || item.sender === "assistant",
                    )
                    .reverse();

                let orderKey = "";

                for (const msg of assistantMessages) {
                    if (msg.metadata && msg.metadata.orderId) {
                        orderKey = msg.metadata.orderId;
                        break;
                    }
                }

                if (!orderKey) {
                    return buildResponse(
                        "reply",
                        `${nickname}, ne znam koju narudžbu želiš ponoviti. Prvo napiši npr. "prikaži narudžbu broj 2".`,
                        [],
                        [],
                    );
                }

                const selectedOrder = userOrders.find((order) =>
                    String(order.key || order.id || "") === String(orderKey),
                );

                if (!selectedOrder) {
                    return buildResponse(
                        "reply",
                        `${nickname}, ne mogu pronaći tu narudžbu za ponovno naručivanje.`,
                        [],
                        [],
                    );
                }

                const items = getOrderItems(selectedOrder);

                if (!items.length) {
                    return buildResponse(
                        "reply",
                        `${nickname}, ta narudžba nema stavki za ponovno dodavanje.`,
                        [],
                        [],
                    );
                }

                return buildResponse(
                    "chat_order_added",
                    `${nickname}, dodao sam ponovno ovu narudžbu:\n\n${items.map((item) => `- ${extractBaseItemName(item)}`).join("\n")}\n\nŽeliš li još nešto?`,
                    items,
                    [],
                );
            }

            // Privremeno ugašeno zbog brzine.
            // if (message && !action && conversationPlan.confidence < 0.75) {
            //   requestPlan = await planUserRequest({
            //     apiKey: openAiKey,
            //     message,
            //     cartItems,
            //   });
            //
            //   console.log("REQUEST PLAN:", JSON.stringify(requestPlan));
            // }


            if (action === "new_chat") {
                return buildResponse(
                    "new_chat_started",
                    `${nickname}, dobrodošao nazad u chat. Pokrenuli smo novi razgovor, tako da ne nastavljam prethodnu narudžbu. Kako ti mogu pomoći?`,
                    [],
                    buildHomeResponse(nickname).actions,
                );
            }


            if (conversationPlan.intent === "compose_order") {

                const suggestions = buildMealSuggestion({
                    message,
                    foods,
                });

                if (suggestions.length) {
                    return buildResponse(
                        "meal_builder",
                        `${nickname}, predlažem:\n\n${suggestions
                            .map((item) => `- ${item}`)
                            .join("\n")}\n\nDa dodam?`,
                        [],
                        [],
                        {
                            lastSuggestedItems: suggestions,
                        },
                    );
                }

                return buildResponse(
                    "reply",
                    `${nickname}, mogu ti pomoći s narudžbom. Reci što bi htio jesti ili piti.`,
                    [],
                    [],
                );
            }

            const pairingResponse = buildPairingRecommendationResponse({
                message,
                nickname,
                foods,
                drinks,
                buildResponse,
            });

            if (pairingResponse) return pairingResponse;



            if (isAskingCoffeePairing(message)) {
                const items = getItemsByTag("uz_kavu", foods, 3);

                return buildResponse(
                    "recommendation",
                    `${nickname}, uz kavu bih preporučio:\n\n${items.map((i) => `- ${i.name}`).join("\n")}`,
                    items.map((i) => i.name),
                    [],
                );
            }



            if (isMealBuilderIntent(message)) {
                const suggestions = buildMealSuggestion({
                    message,
                    foods,
                });

                if (suggestions.length) {
                    return buildResponse(
                        "meal_builder",
                        `${nickname}, predlažem:\n\n${suggestions
                            .map((item) => `- ${item}`)
                            .join("\n")}\n\nDa dodam?`,
                        [],
                        [],
                        {
                            lastSuggestedItems: suggestions,
                        },
                    );
                }
            }


            if (conversationPlan.intent === "add_to_cart") {
                const result = resolveRequestedItems(
                    conversationPlan.items,
                    foods,
                    drinks,
                );

                if (result.ambiguous.length > 0) {
                    const first = result.ambiguous[0];

                    return buildResponse(
                        "clarify_order",
                        `${nickname}, našao sam više mogućnosti za "${first.requestedName}". Na što si mislio?\n\n${first.options.map((item) => `- ${item.name}`).join("\n")
                        }`,
                        [],
                        first.options.map((item) =>
                            buildAction(`pick_menu_item|${item.name}|open_menu_browser`, item.name),
                        ),
                    );
                }

                if (result.missing.length > 0) {
                    const first = result.missing[0];

                    return buildResponse(
                        "clarify_order",
                        `${nickname}, ne mogu sigurno pronaći "${first.requestedName}" u meniju. Možeš napisati točan naziv artikla ili pitati za odredenu kategoriju hrane/pica.`,
                        [],
                        [],
                    );
                }

                if (result.resolvedItems.length > 0) {
                    const addedItems = result.resolvedItems.map((resolved) =>
                        `${resolved.item.name}(X${resolved.quantity})`,
                    );

                    const cartSuggestions = buildCartBasedSuggestions({
                        cartItems,
                        addedItems,
                        foods,
                        drinks,
                    });

                    const suggestionText = buildCartBasedSuggestionsText(cartSuggestions);

                    const displayItems = result.resolvedItems.map((resolved) =>
                        `- ${resolved.item.name}${resolved.quantity > 1 ? ` x${resolved.quantity}` : ""}`,
                    );

                    return buildResponse(
                        "chat_order_added",
                        `${nickname}, dodao sam:\n\n${displayItems.join("\n")}${suggestionText}`,
                        addedItems,
                        [
                            buildAction("go_to_cart", "Završi narudžbu"),
                        ],
                        {
                            lastSuggestedItems: cartSuggestions,
                        },
                    );
                }

                return buildResponse(
                    "clarify_order",
                    `${nickname}, što želiš dodati u narudžbu?`,
                    [],
                    [],
                );
            }
            if (conversationPlan.intent === "repeat_order_filtered") {
                const category = conversationPlan.category;
                const normalizedMessage = normalizeText(message);

                const lastAssistantMessage = history
                    .filter((item) =>
                        item.role === "assistant" || item.sender === "assistant",
                    )
                    .slice(-1)[0];

                const assistantText =
                    (lastAssistantMessage &&
                        (
                            lastAssistantMessage.content ||
                            lastAssistantMessage.message ||
                            lastAssistantMessage.text
                        )) ||
                    "";

                const orderKey =
                    lastAssistantMessage &&
                        lastAssistantMessage.metadata &&
                        lastAssistantMessage.metadata.orderId ?
                        lastAssistantMessage.metadata.orderId :
                        null;
                const selectedOrder = userOrders.find((order) =>
                    String(order.key || order.id || "") === String(orderKey),
                );

              if (!selectedOrder) {
                  const suggestedFromText = resolveSuggestedItemFromMessage(
                      message,
                      getLastSuggestedItems(history),
                  );

                  if (suggestedFromText) {
                      return buildResponse(
                          "chat_order_added",
                          `${nickname}, dodao sam ${suggestedFromText}. Želiš li još nešto?`,
                          [`${suggestedFromText}(X1)`],
                          [buildAction("go_to_cart", "Završi narudžbu")],
                          {
                              lastSuggestedItems: [],
                          },
                      );
                  }

                  return buildResponse(
                      "reply",
                      `${nickname}, ako želiš odabrati nešto iz preporuke koju sam ti dao, napiši npr.:

                  - dodaj cezar salatu
                  - dodaj pastu bolognese
                  - dodaj sladoled

                  Tako ću ga odmah dodati u narudžbu. `,
                      [],
                      [],
                      {
                          lastSuggestedItems: [],
                      },
                  );
              }

                const items = getOrderItems(selectedOrder);
                const menu = [].concat(foods, drinks);

                let filteredItems = [];

                console.log("MESSAGE:", normalizedMessage);

                items.forEach((item) => {
                    console.log(
                        "ITEM:",
                        extractBaseItemName(item),
                        normalizeText(extractBaseItemName(item)),
                    );
                });

                console.log("MESSAGE:", normalizedMessage);

                items.forEach((item) => {
                    console.log(
                        "ORDER ITEM:",
                        extractBaseItemName(item),
                        normalizeText(extractBaseItemName(item)),
                    );
                });

                const exactRequestedItems = items.filter((rawItem) => {
                    const baseName = normalizeText(
                        extractBaseItemName(rawItem),
                    );

                    const words = baseName
                        .split(" ")
                        .filter((w) => w.length > 2);

                    const matches = words.filter((word) =>
                        normalizedMessage.includes(word),
                    );

                    return matches.length >= Math.max(1, words.length - 1);
                });

                if (exactRequestedItems.length > 0) {
                    filteredItems = exactRequestedItems;
                } else {
                    filteredItems = items.filter((rawItem) => {
                        const baseName = extractBaseItemName(rawItem);

                        const menuItem = menu.find((item) =>
                            normalizeText(item.name || "") === normalizeText(baseName),
                        );

                        if (!menuItem) return false;

                        const itemCategory = normalizeText(menuItem.category || "");
                        const wantedCategory = normalizeText(category);

                        return (
                            itemCategory.includes(wantedCategory) ||
                            normalizeText(baseName).includes(wantedCategory)
                        );
                    });
                }

                if (!filteredItems.length) {
                    return buildResponse(
                        "reply",
                        `${nickname}, u toj narudžbi nisam pronašao artikle za: ${category}.`,
                        [],
                        [],
                    );
                }

                if (exactRequestedItems.length === 1) {
                    filteredItems = exactRequestedItems;
                }

                if (
                    filteredItems.length > 1 &&
                    exactRequestedItems.length === 0
                ) {
                    return buildResponse(
                        "clarify_order",
                        `${nickname}, u toj narudžbi ima više takvih artikala:\n\n${filteredItems
                            .map((item) => `- ${extractBaseItemName(item)}`)
                            .join("\n")}\n\nKoji želiš uzeti?`,
                        filteredItems,
                        [],
                    );
                }

                const itemsWithDetails = filteredItems.filter((item) =>
                    item.includes("MODIFIKACIJE:") || item.includes("NAPOMENA:"),
                );

                if (itemsWithDetails.length > 0) {
                    return buildResponse(
                        "confirm_repeat_with_modifications",
                        `${nickname}, ovaj artikl je prije imao dodatke ili napomenu:\n\n${itemsWithDetails
                            .map((item) => `- ${item}`)
                            .join("\n\n")}\n\nŽeliš li ga dodati s istim dodacima kao prije ili bez dodataka?`,
                        filteredItems,
                        [],
                        {
                            repeatItem: encodeRepeatItem(itemsWithDetails[0]),
                        },
                    );
                }

                const requestedQuantity = extractRequestedQuantity(message);

                const finalItems = filteredItems.map((item) =>
                    replaceItemQuantity(item, requestedQuantity),
                );

                return buildResponse(
                    "chat_order_added",
                    `${nickname}, dodao sam iz te narudžbe:\n\n${finalItems
                        .map((item) => {
                            const quantityMatch = item.match(/\(X(\d+)\)/i);
                            const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;

                            return `- ${extractBaseItemName(item)}${quantity > 1 ? ` x${quantity}` : ""}`;
                        })
                        .join("\n")}`,
                    finalItems,
                    [],
                    {
                        selectedRepeatItem: finalItems[0],
                    },
                );
            }

            if (conversationPlan.intent === "item_question") {
                const requestedName =
                    conversationPlan.items &&
                    conversationPlan.items[0] &&
                    conversationPlan.items[0].name ?
                        conversationPlan.items[0].name :
                        message;

                const item = findMenuItemFromMessage(
                    requestedName,
                    foods,
                    drinks,
                ) || findMenuItemFromMessage(
                    message,
                    foods,
                    drinks,
                );

                if (!item) {
                    return buildResponse(
                        "item_info",
                        `${nickname}, ne mogu pronaći taj artikl u meniju.`,
                        [],
                        [],
                    );
                }

                const opis = item.opis || item.description || "";
                const sastojci = Array.isArray(item.sastojci) ?
                    item.sastojci :
                    Array.isArray(item.ingredients) ?
                        item.ingredients :
                        [];

                if (!opis && !sastojci.length) {
                    return buildResponse(
                        "item_info",
                        `${nickname}, nemam podatke o sastavu niti opisu artikla ${item.name}.`,
                        [],
                        [],
                    );
                }

                return buildResponse(
                    "item_info",
                    `${nickname}, ${item.name}\n\n${opis ? `Opis: ${opis}\n\n` : ""}${sastojci.length ? `Sastojci: ${sastojci.join(", ")}` : ""}`,
                    [item.name],
                    [],
                );
            }




            if (conversationPlan.intent === "category_question") {
                return buildCategoryItemsResponse(
                    nickname,
                    conversationPlan.category,
                    foods,
                    drinks,
                );
            }
            if (conversationPlan.intent === "clarify_order") {
                return buildCategoryItemsResponse(
                    nickname,
                    conversationPlan.category,
                    foods,
                    drinks,
                );
            }

            if (conversationPlan.intent === "history_order_detail") {
                const deliveredOrders = sortOrdersByCreatedAtDesc(
                    userOrders.filter((order) =>
                        normalizeText((order && order.status) || "") === normalizeText("Dostavljeno"),
                    ),
                );

                const selectedOrder = deliveredOrders[conversationPlan.orderNumber - 1];

                return buildHistoryOrderDetailResponse(
                    nickname,
                    selectedOrder,
                );
            }

            if (conversationPlan.intent === "order_history") {
                return buildOrderHistoryResponse(nickname, userOrders);
            }

            if (conversationPlan.intent === "last_order") {
                return buildLastDeliveredOrderResponse(
                    nickname,
                    lastDeliveredOrderItems,
                );
            }
            console.log(
                "REPEAT FILTER PLAN:",
                JSON.stringify(conversationPlan, null, 2),
            );

            if (
                conversationPlan.intent ===
                "repeat_order_filtered_with_modifications"
            ) {
                const assistantMessages = history
                    .filter((item) =>
                        item.role === "assistant" || item.sender === "assistant",
                    )
                    .reverse();

                let encodedItem = "";

                for (const msg of assistantMessages) {
                    if (msg.metadata && msg.metadata.repeatItem) {
                        encodedItem = msg.metadata.repeatItem;
                        break;
                    }
                }

                if (!encodedItem) {
                    return buildResponse(
                        "reply",
                        `${nickname}, ne znam koji artikl želiš dodati. Napiši ponovno naziv artikla.`,
                        [],
                        [],
                    );
                }

                const fullItem = decodeRepeatItem(encodedItem);
                const baseName = extractBaseItemName(fullItem);
                const requestedQuantity = extractRequestedQuantity(message);
                const finalItem = replaceItemQuantity(fullItem, requestedQuantity);

                return buildResponse(
                    "chat_order_added",
                    `${nickname}, dodao sam ${baseName} s istim dodacima kao prije.`,
                    [finalItem],
                    [],
                );
            }

            if (
                conversationPlan.intent ===
                "repeat_order_filtered_without_modifications"
            ) {
                const assistantMessages = history
                    .filter((item) =>
                        item.role === "assistant" || item.sender === "assistant",
                    )
                    .reverse();

                let encodedItem = "";

                for (const msg of assistantMessages) {
                    if (msg.metadata && msg.metadata.repeatItem) {
                        encodedItem = msg.metadata.repeatItem;
                        break;
                    }
                }

                if (!encodedItem) {
                    return buildResponse(
                        "reply",
                        `${nickname}, ne znam koji artikl želiš dodati. Napiši ponovno naziv artikla.`,
                        [],
                        [],
                    );
                }

                const fullItem = decodeRepeatItem(encodedItem);
                const baseName = extractBaseItemName(fullItem);
                const requestedQuantity = extractRequestedQuantity(message) || 1;

                return buildResponse(
                    "chat_order_added",
                    `${nickname}, dodao sam ${baseName} bez dodataka.`,
                    [`${baseName}(X${requestedQuantity})`],
                    [],
                );
            }

            if (conversationPlan.intent === "show_cart") {
                return buildCartResponse(nickname, cartItems);
            }
            if (conversationPlan.intent === "popular_items") {
                const popularCategory =
                    getPopularCategoryFromMessage(message) ||
                    getRecommendationCategoryFromMessage(message, conversationPlan.category);

                if (popularCategory) {
                    const items = buildPopularItemsByCategory(
                        allOrders,
                        foods,
                        drinks,
                        popularCategory,
                        3,
                    );

                    return buildResponse(
                        "popular_items",
                        items.length > 0 ?
                            `${nickname}, najpopularnije iz kategorije ${popularCategory} su:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                            `${nickname}, trenutno nemam dovoljno podataka za popularne artikle iz kategorije ${popularCategory}.`,
                        items,
                        items.map((item) =>
                            buildAction(`pick_menu_item|${item}|open_menu_browser`, `Dodaj ${item}`),
                        ),
                    );
                }

                const items = buildPopularItems(allOrders, foods, drinks, 3);
                const popularItemNames = extractPopularItemNames(items);

                return buildResponse(
                    "popular_items",
                    items.length > 0 ?
                        `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n\n")}` :
                        `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
                    popularItemNames,
                    [],
                );
            }

            if (conversationPlan.intent === "recommendation") {
                const text = normalizeText(message);

                const recommendationCategory = getRecommendationCategoryFromMessage(
                    message,
                    conversationPlan.category,
                );

             if (recommendationCategory) {
                 const items = getSmartRecommendationsByCategory(
                     recommendationCategory,
                     userOrders,
                     allOrders,
                     foods,
                     drinks,
                     3,
                 );

                 const label = getRecommendationCategoryLabel(recommendationCategory);

                 return buildResponse(
                     "recommendation",
                     items.length > 0 ?
                         `${nickname}, od ${label} preporučujem:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                         `${nickname}, trenutno nemam preporuku za ${label}.`,
                     items,
                     [],
                     {
                         lastSuggestedItems: items, shouldAskQuantityAfterSuggestion: true,
                     },
                 );
             }

                const items = buildPopularItems(allOrders, foods, drinks, 3);
                const itemNames = extractPopularItemNames(items);

                return buildResponse(
                    "recommendation",
                    items.length > 0 ?
                        `${nickname}, predlažem ti:\n\n${items.map((item) => `- ${item}`).join("\n")}\n\nAko želiš, mogu ti preporučiti i nešto po tvojim prošlim narudžbama ili iz neke kategorije.` :
                        `${nickname}, mogu ti preporučiti pizzu, sendvič, desert, predjelo ili glavno jelo. Što ti zvuči najbolje?`,
                    itemNames,
                    [],
                    {
                        lastSuggestedItems: itemNames,
                        shouldAskQuantityAfterSuggestion: true,
                    },
                );
            }


            if (conversationPlan.intent === "order_status") {
                return buildOrderSelectionResponse(nickname, activeOrders);
            }

            if (conversationPlan.intent === "finish_order") {
                return buildResponse(
                    "reply",
                    `${nickname}, za završetak narudžbe otvori pregled košarice i tamo potvrdi slanje narudžbe.`,
                    [],
                    [
                        buildAction("go_to_cart", "Završi narudžbu"),
                    ],
                );
            }

            if (conversationPlan.intent === "small_talk") {
                return buildResponse(
                    "reply",
                    `${nickname}, bok. Mogu ti pomoći složiti narudžbu, preporučiti jelo, provjeriti košaricu ili pokazati meni.`,
                    [],
                    [],
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
                    [],
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
                        ],
                    );
                }

                return buildResponse(
                    "reply",
                    `${nickname}, trenutno nemaš aktivnu narudžbu i ne mogu pronaći prethodne narudžbe.`,
                    [],
                    [buildAction("open_home", "Početak")],
                );
            }

if (isAskingRecommendations(message)) {
    const recommendationCategory = getRecommendationCategoryFromMessage(
        message,
        conversationPlan.category,
    );

    if (recommendationCategory) {
        const items = getSmartRecommendationsByCategory(
            recommendationCategory,
            userOrders,
            allOrders,
            foods,
            drinks,
            3,
        );

        const label = getRecommendationCategoryLabel(recommendationCategory);

        return buildResponse(
            "recommendation",
            items.length > 0 ?
                `${nickname}, od ${label} preporučujem:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                `${nickname}, trenutno nemam preporuku za ${label}.`,
            items,
            [],
            {
                lastSuggestedItems: items,
                shouldAskQuantityAfterSuggestion: true,
            },
        );
    }

    const items = buildPopularItems(allOrders, foods, drinks, 3);
    const itemNames = extractPopularItemNames(items);

    return buildResponse(
        "recommendation",
        items.length > 0 ?
            `${nickname}, predlažem ti:\n\n${items.map((item) => `- ${item}`).join("\n")}\n\nMogu ti preporučiti i nešto po tvojim prošlim narudžbama ili iz neke kategorije.` :
            `${nickname}, mogu ti preporučiti pizzu, sendvič, desert, predjelo ili glavno jelo. Što ti zvuči najbolje?`,
        itemNames,
        [],
        {
            lastSuggestedItems: itemNames,
            shouldAskQuantityAfterSuggestion: true,
        },
    );
}

            const popularCategory = getRecommendationCategoryFromMessage(
                message,
                conversationPlan.category,
            );

            if (isAskingPopularItems(message) && popularCategory) {
                const items = buildPopularItemsByCategory(
                    allOrders,
                    foods,
                    drinks,
                    popularCategory,
                    3,
                );

                return buildResponse(
                    "popular_items",
                    items.length > 0 ?
                        `${nickname}, najpopularnije iz kategorije ${popularCategory} su:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                        `${nickname}, trenutno nemam dovoljno podataka za popularne artikle iz kategorije ${popularCategory}.`,
                    items,
                    items.map((item) =>
                        buildAction(`pick_menu_item|${item}|open_menu_browser`, `Dodaj ${item}`),
                    ),
                );
            }

            if (isAskingPopularItems(message)) {
                const popularCategory = getPopularCategoryFromMessage(message);

                if (popularCategory) {
                    const items = buildPopularItemsByCategory(
                        allOrders,
                        foods,
                        drinks,
                        popularCategory,
                        3,
                    );

                    return buildResponse(
                        "popular_items",
                        items.length > 0 ?
                            `${nickname}, najpopularnije iz kategorije ${popularCategory} su:\n\n${items.map((item) => `- ${item}`).join("\n")}` :
                            `${nickname}, trenutno nemam dovoljno podataka za popularne artikle iz kategorije ${popularCategory}.`,
                        items,
                        items.map((item) =>
                            buildAction(`pick_menu_item|${item}|open_menu_browser`, `Dodaj ${item}`),
                        ),
                    );
                }

                const items = buildPopularItems(allOrders, foods, drinks, 3);
                const popularItemNames = extractPopularItemNames(items);

                return buildResponse(
                    "popular_items",
                    items.length > 0 ?
                        `${nickname}, trenutno su najpopularniji artikli:\n\n${items.map((item) => `- ${item}`).join("\n\n")}` :
                        `${nickname}, trenutno nemam dovoljno podataka o popularnim artiklima.`,
                    popularItemNames,
                    popularItemNames.length > 0 ?
                        buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular") :
                        [buildAction("open_home", "Početak")],
                );
            }

            const ordersContextJson = buildOrdersContext(activeOrder, null);
            if (isAskingCart(message)) {
                return buildCartResponse(nickname, cartItems);
            }

            if (isSmallTalk(message)) {
                return buildResponse(
                    "reply",
                    `${nickname}, bok. Mogu ti pomoći s jelovnikom, cijenama, alergenima, preporukama i statusom narudžbe.`,
                    [],
                    buildDefaultInfoActions(),
                );
            }


            if (isAskingRecommendedDrinksForFood(message)) {
                return buildRecommendedDrinksForFoodResponse(nickname, message, foods, drinks);
            }

            const orderingResult = await handleOrderingIntent({
                message,
                nickname,
                foods,
                drinks,
                modifications,
                openAiKey,
            });

            if (orderingResult) return orderingResult;


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
                    ],
                );
            }


            if (isConfirmYes(message)) {
                return buildResponse(
                    "reply",
                    `${nickname}, za potvrdu dodavanja napiši što želiš dodati.`,
                    [],
                    buildMainActions(),
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
                        ],
                    );
                }

                return buildResponse(
                    "reply",
                    `${nickname}, trenutno ne mogu pronaći narudžbu na koju se pitanje odnosi.`,
                    [],
                    [buildAction("open_home", "Početak")],
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
 Za dodavanje artikala korisnik može pisati u chat.
- Nikad ne tvrdi da korisnik već ima artikl u košarici osim ako je to izričito navedeno u cartItems kontekstu.
- Ne koristi prethodni razgovor kao dokaz sadržaja košarice.
- Ako korisnik želi dodati artikl, a nisi u parseru, reci da napiše točan artikl .

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
                buildMainActions(),
            );
        } catch (err) {
            console.error("chatWaiter FULL ERROR:", err);
            console.error("chatWaiter STACK:", err && err.stack);

            if (err instanceof HttpsError) {
                throw err;
            }

            throw new HttpsError(
                "internal",
                "Greška na serveru (chatWaiter).",
                {
                    message: (err && err.message) || "Unknown error",
                    stack: (err && err.stack) || "",
                },
            );
        }
    },
);