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
          return buildRepeatLastOrderSubmitResponse(
              nickname,
              lastDeliveredOrderItems,
          );
        }

        if (action === "repeat_last_order_to_cart") {
          return buildRepeatLastOrderToCartResponse(
              nickname,
              lastDeliveredOrderItems,
          );
        }

        if (action === "repeat_last_any_order_submit") {
          return buildRepeatLastAnyOrderSubmitResponse(
              nickname,
              lastAnyOrderItems,
          );
        }

        if (action === "repeat_last_any_order_to_cart") {
          return buildRepeatLastAnyOrderToCartResponse(
              nickname,
              lastAnyOrderItems,
          );
        }

        if (action === "open_personal_recommendations") {
          return buildRecommendationTypeMenuResponse(nickname);
        }

        if (action === "recommend_favorites") {
          const items = buildFavoritesRecommendations(userOrders, foods, drinks, 3);
          const groupedText = buildGroupedRecommendationText(
              nickname,
              items,
              foods,
              drinks,
          );

          return buildResponse(
              "personal_recommendations",
              groupedText,
              items,
              [],
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
    popularItemNames.length > 0 ?
      buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular") :
      [buildAction("open_home", "Početak")],
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
              "recommend_new",
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
                [buildAction("open_home", "Početak")],
            );
          }

          return buildResponse(
              "recommendation_pick_confirm",
              `${nickname}, želiš li da dodam ${selectedItem} u tvoju narudžbu?`,
              [`${selectedItem}(X1)`],
              [
                buildAction(`confirm_recommendation_add|${selectedItem}|${sourceAction}`, "Da"),
                buildAction(sourceAction, "Odaberi nešto drugo"),
              ],
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
                [buildAction("open_home", "Početak")],
            );
          }

          return buildResponse(
              "recommendation_added",
              `${nickname}, dodali ste ${selectedItem} u svoju narudžbu. U pregledu narudžbe možete pritisnuti artikl za napomene i modifikacije.`, [`${selectedItem}(X1)`],
              [
                buildAction(sourceAction, "Još ovakvih preporuka"),
                buildAction("go_to_cart", "Završi narudžbu"),
                buildAction("open_home", "Početak"),
              ],
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

        if (action.startsWith("select_history_order|")) {
          const selectedKey = action.split("|")[1];

          const selectedOrder = userOrders.find((order) =>
            String(order.key || order.id || "") === String(selectedKey),
          );

          return buildHistoryOrderDetailResponse(nickname, selectedOrder);
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
      popularItemNames.length > 0 ?
        buildRecommendationItemActionsWhenChoosingWhatIsPopular(popularItemNames, "recommend_popular") :
        [buildAction("open_home", "Početak")],
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
              ],
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
              ],
          );
        }

        if (action === "menu_food_root") {
          return buildResponse(
              "menu_categories",
              `${nickname}, odaberi kategoriju hrane.`,
              [],
              buildMenuCategoryActions(foods, "food"),
          );
        }

        if (action === "menu_drink_root") {
          return buildResponse(
              "menu_categories",
              `${nickname}, odaberi kategoriju pića.`,
              [],
              buildMenuCategoryActions(drinks, "drink"),
          );
        }

        if (action.startsWith("menu_food_category|")) {
          const category = action.split("|")[1];

          const items = foods.filter((item) => (item && item.category) === category);
          const backAction = "menu_food_root";

          return buildResponse(
              "menu_items",
              `${nickname}, odaberi artikl iz kategorije ${category}.`,
              [],
              buildMenuItemActions(items, backAction),
          );
        }

        if (action.startsWith("repeat_history_order_submit|")) {
          const selectedKey = action.split("|")[1];

          const selectedOrder = userOrders.find((order) =>
            String(order.key || order.id || "") === String(selectedKey),
          );

          const items = getOrderItems(selectedOrder);

          return buildResponse(
              "repeat_history_order_submit",
            items.length > 0 ?
              `${nickname}, želiš li odmah poslati ovu narudžbu u kuhinju: ${items.join(", ")}?` :
              `${nickname}, ne mogu pronaći stavke za ovu narudžbu.`,
            items,
            [],
          );
        }


        if (action.startsWith("repeat_history_order_to_cart|")) {
          const selectedKey = action.split("|")[1];

          const selectedOrder = userOrders.find((order) =>
            String(order.key || order.id || "") === String(selectedKey),
          );

          const items = getOrderItems(selectedOrder);

          return buildResponse(
              "repeat_history_order_to_cart",
            items.length > 0 ?
              `${nickname}, mogu prebaciti ovu narudžbu u košaricu za prilagodbu: ${items.join(", ")}. Želiš li to?` :
              `${nickname}, ne mogu pronaći stavke za ovu narudžbu.`,
            items,
            [],
          );
        }

        if (action.startsWith("menu_drink_category|")) {
          const category = action.split("|")[1];

          const items = drinks.filter((item) => (item && item.category) === category);
          const backAction = "menu_drink_root";

          return buildResponse(
              "menu_items",
              `${nickname}, odaberi artikl iz kategorije ${category}.`,
              [],
              buildMenuItemActions(items, backAction),
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
                ],
            );
          }

          return buildMenuItemConfirmResponse(nickname, itemName, backAction);
        }

        if (action.startsWith("filter_history_order|")) {
          const parts = action.split("|");
          const selectedKey = parts[1];
          const wantedCategory = parts[2] || "";

          const selectedOrder = userOrders.find((order) =>
            String(order.key || order.id || "") === String(selectedKey),
          );

          const items = getOrderItems(selectedOrder);
          const menu = [].concat(foods, drinks);

          const filteredItems = items.filter((rawItem) => {
            const baseName = extractBaseItemName(rawItem);

            const menuItem = menu.find((item) =>
              item && item.name === baseName,
            );

            const category = normalizeText((menuItem && menuItem.category) || "");
            const name = normalizeText(baseName);
            const wanted = normalizeText(wantedCategory);

            return category.includes(wanted) || name.includes(wanted);
          });

          if (!filteredItems.length) {
            return buildResponse(
                "reply",
                `${nickname}, u toj narudžbi nisam pronašao artikle za: ${wantedCategory}.`,
                [],
                [
                  buildAction("open_home", "Početak"),
                ],
            );
          }

          return buildResponse(
              "history_order_filtered",
              `${nickname}, iz te narudžbe mogu uzeti:\n\n${filteredItems.map((item) => `- ${extractBaseItemName(item)}`).join("\n")}\n\nŽeliš li to dodati u košaricu?`,
              filteredItems,
              [
                buildAction("go_to_cart", "Završi narudžbu"),
                buildAction("open_home", "Početak"),
              ],
          );
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
                ],
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
              ],
          );
        }


        const selectedRepeatItem = getLastSelectedRepeatItem(history);
        const correctedQuantity = extractRequestedQuantity(message);

        if (
          message &&
          !action &&
          selectedRepeatItem &&
          correctedQuantity &&
          isQuantityCorrectionIntent(message)
        ) {
          const finalItem = replaceItemQuantity(selectedRepeatItem, correctedQuantity);
          const baseName = extractBaseItemName(finalItem);

          return buildResponse(
              "chat_order_added",
              `${nickname}, ažurirao sam količinu:\n\n- ${baseName} x${correctedQuantity}`,
              [finalItem],
              [],
              {
                selectedRepeatItem: finalItem,
              },
          );
        }



       if (action === "new_chat") {
         return buildResponse(
             "new_chat_started",
             `${nickname}, dobrodošao nazad u chat. Pokrenuli smo novi razgovor. Kako ti mogu pomoći?`,
             [],
             buildHomeResponse(nickname).actions,
         );
       }





        if (conversationPlan.confidence >= 0.75) {
          if (conversationPlan.intent === "item_question") {
            const result = resolveRequestedItems(
                conversationPlan.items,
                foods,
                drinks,
            );

            if (result.resolvedItems.length === 1) {
              const menuItem = result.resolvedItems[0].item;

              const description = menuItem.description ||
              menuItem.opis ||
              menuItem.desc ||
              "nemam detaljan opis za taj artikl.";

              const price = menuItem.price || menuItem.cijena || menuItem.priceCents;

              return buildResponse(
                  "item_info",
                  `${nickname}, ${menuItem.name}: ${description}${price ? `\n\nCijena: ${price}` : ""}`,
                  [],
                  [],
              );
            }

            if (result.ambiguous.length > 0) {
              const first = result.ambiguous[0];

              return buildResponse(
                  "clarify_order",
                  `${nickname}, našao sam više artikala za "${first.requestedName}". Na koji misliš?\n\n${first.options.map((item) => `- ${item.name}`).join("\n")}`,
                  [],
                  [],
              );
            }

            return buildResponse(
                "reply",
                `${nickname}, ne mogu pronaći taj artikl u meniju.`,
                [],
                [],
            );
          }