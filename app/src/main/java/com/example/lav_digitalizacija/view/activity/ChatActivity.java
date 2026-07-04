package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.ChatMessage;
import com.example.lav_digitalizacija.view.adapter.ChatAdapter;
import com.google.android.material.button.MaterialButton;
import com.google.common.reflect.TypeToken;
import com.google.firebase.BuildConfig;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.MutableData;
import com.google.firebase.database.Transaction;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.gson.Gson;

import java.lang.reflect.Type;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ChatActivity extends AppCompatActivity {

    private RecyclerView rvChat;
    private EditText etMessage;
    private MaterialButton btnSend;
    private HorizontalScrollView actionsScroll;
    private LinearLayout layoutQuickActions;

    private FirebaseFunctions functions;
    private ChatAdapter adapter;

    private DatabaseReference chatHistoryRef;
    private String userId;

    private String pendingAction = null;
    private final ArrayList<String> pendingItems = new ArrayList<>();
    private final List<ChatMessage> messages = new ArrayList<>();

    private String activeMode = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        rvChat = findViewById(R.id.rvChat);
        etMessage = findViewById(R.id.etMessage);
        btnSend = findViewById(R.id.btnSend);
        actionsScroll = findViewById(R.id.actionsScroll);
        layoutQuickActions = findViewById(R.id.layoutQuickActions);

        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        userId = currentUser != null ? currentUser.getUid() : null;

        if (userId != null) {
            chatHistoryRef = FirebaseDatabase.getInstance()
                    .getReference("chat_history")
                    .child(userId);
        }

        functions = FirebaseFunctions.getInstance("europe-west1");
        if (BuildConfig.DEBUG) {
            functions.useEmulator("10.0.2.2", 5001);
        }
        Log.d("CHAT_FN", "Using Functions emulator on 10.0.2.2:5001");
        adapter = new ChatAdapter(messages);

        LinearLayoutManager lm = new LinearLayoutManager(this);
        lm.setStackFromEnd(true);
        rvChat.setLayoutManager(lm);
        rvChat.setAdapter(adapter);

        pendingAction = null;
        pendingItems.clear();

        ucitajZadnjePoruke();
        etMessage.setEnabled(true);
        etMessage.setHint("Napiši poruku...");

        btnSend.setOnClickListener(v -> {
            String text = etMessage.getText().toString().trim();

            if (text.isEmpty()) return;


            if (pendingAction != null) {
                obradiPendingFlow(text);
                return;
            }

            ChatMessage userMessage = new ChatMessage(text, true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);
            etMessage.setText("");

            sendToAI(text);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        clearQuickActions();
    }

    private void refreshHomeActionsOnly() {
        Map<String, Object> data = buildBasePayload();
        data.put("message", "");
        data.put("action", "open_home");
        data.put("mode", activeMode);

        functions.getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {
                    ParsedResponse parsed = parseResponse(result.getData());
                    Log.d("CHAT_FN", "Home actions: " + parsed.actions);
                    showQuickActions(parsed.actions);
                })
                .addOnFailureListener(e -> Log.e("CHAT_FN", "Failed to refresh home actions", e));
    }

    private void potvrdiSlanjeNarudzbeUKuhinju(ArrayList<String> items) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");

        View view = getLayoutInflater().inflate(R.layout.dialog_repeat_order, null);
        builder.setView(view);

        AlertDialog dialog = builder.create();
        dialog.setCancelable(true);
        dialog.show();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(
                    new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT)
            );
        }

        android.widget.TextView tvRepeatMessage = view.findViewById(R.id.tvRepeatMessage);
        android.widget.Button btnRepeatAdd = view.findViewById(R.id.btnRepeatAdd);
        android.widget.Button btnRepeatCancel = view.findViewById(R.id.btnRepeatCancel);

        if (items != null && !items.isEmpty()) {
            ArrayList<String> formattedItems = new ArrayList<>();
            for (String item : items) {
                formattedItems.add(formatOrderItemForDisplay(item));
            }

            tvRepeatMessage.setText(
                    nickname + ", želiš li odmah poslati ovu narudžbu u kuhinju?\n\n" +
                            android.text.TextUtils.join("\n", formattedItems)
            );
        }

        btnRepeatAdd.setText("Pošalji");
        btnRepeatAdd.setOnClickListener(v -> {
            dialog.dismiss();

            ChatMessage doneMessage = new ChatMessage(
                    "Narudžba je poslana u kuhinju.",
                    false
            );
            adapter.addMessage(doneMessage);
            spremiPorukuUHistory(doneMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            refreshHomeActionsOnly();
        });

        btnRepeatCancel.setOnClickListener(v -> dialog.dismiss());
    }

    private void obradiPendingFlow(String text) {
        if (jePotvrda(text)) {
            ChatMessage userMessage = new ChatMessage(text, true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            if ("repeat_last_order".equals(pendingAction)
                    || "create_order_draft".equals(pendingAction)
                    || "repeat_last_order_to_cart".equals(pendingAction)
                    || "repeat_last_any_order_to_cart".equals(pendingAction)) {
                potvrdiDodavanjeStavkiUKosaricu(new ArrayList<>(pendingItems));
            }

            pendingAction = null;
            pendingItems.clear();
            etMessage.setText("");
            return;
        }

        if (jeOdbijanje(text)) {
            ChatMessage userMessage = new ChatMessage(text, true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            ChatMessage aiMessage = new ChatMessage(
                    "U redu, neću ništa dodati u košaricu.",
                    false
            );
            adapter.addMessage(aiMessage);
            spremiPorukuUHistory(aiMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            pendingAction = null;
            pendingItems.clear();
            etMessage.setText("");
            return;
        }

        ChatMessage userMessage = new ChatMessage(text, true);
        adapter.addMessage(userMessage);
        spremiPorukuUHistory(userMessage);
        rvChat.scrollToPosition(messages.size() - 1);
        etMessage.setText("");

        ChatMessage aiMessage = new ChatMessage(
                "Molim te potvrdi s 'da' ili odustani s 'ne'.",
                false
        );
        adapter.addMessage(aiMessage);
        spremiPorukuUHistory(aiMessage);
        rvChat.scrollToPosition(messages.size() - 1);
    }

    private boolean jePotvrda(String text) {
        String t = text.toLowerCase().trim();
        return t.equals("da")
                || t.equals("moze")
                || t.equals("može")
                || t.equals("ok")
                || t.equals("okej")
                || t.equals("yes");
    }

    private boolean jeOdbijanje(String text) {
        String t = text.toLowerCase().trim();
        return t.equals("ne")
                || t.equals("nemoj")
                || t.equals("odustani")
                || t.equals("cancel");
    }

    private void ucitajZadnjePoruke() {
        if (chatHistoryRef == null) {
            prikaziWelcomePorukuAkoTreba();
            return;
        }

        chatHistoryRef.orderByChild("timestamp")
                .limitToLast(20)
                .addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(@NonNull DataSnapshot snapshot) {
                        messages.clear();

                        for (DataSnapshot child : snapshot.getChildren()) {
                            ChatMessage msg = child.getValue(ChatMessage.class);
                            if (msg != null && msg.getText() != null) {
                                messages.add(msg);
                            }
                        }

                        adapter.notifyDataSetChanged();

                        if (!messages.isEmpty()) {
                            rvChat.scrollToPosition(messages.size() - 1);
                            clearQuickActions();
                        } else {
                            prikaziWelcomePorukuAkoTreba();
                        }
                    }

                    @Override
                    public void onCancelled(@NonNull DatabaseError error) {
                        prikaziWelcomePorukuAkoTreba();
                    }
                });
    }

    private void prikaziWelcomePorukuAkoTreba() {
        if (messages.isEmpty()) {
            ChatMessage welcome = new ChatMessage(
                    "Bok, ja sam AI konobar. Napiši što želiš naručiti ili pitaj za prethodne narudžbe.",
                    false
            );

            adapter.addMessage(welcome);
            spremiPorukuUHistory(welcome);
        }
    }

    private void spremiPorukuUHistory(ChatMessage message) {
        if (chatHistoryRef == null || message == null) return;

        String key = chatHistoryRef.push().getKey();
        if (key != null) {
            chatHistoryRef.child(key).setValue(message);
        }
    }

    private void clearQuickActions() {
        if (layoutQuickActions != null) {
            layoutQuickActions.removeAllViews();
        }
        if (actionsScroll != null) {
            actionsScroll.setVisibility(View.GONE);
        }
    }

    /**
     * private void showQuickActions(ArrayList<Map<String, String>> actions) {
     * clearQuickActions();
     * <p>
     * actions = withHomeActions(actions);
     * <p>
     * if (actions == null || actions.isEmpty() || layoutQuickActions == null || actionsScroll == null) {
     * return;
     * }
     * <p>
     * for (Map<String, String> action : actions) {
     * if (action == null) continue;
     * <p>
     * String actionId = action.get("id");
     * String label = action.get("label");
     * <p>
     * if (actionId == null || label == null) continue;
     * <p>
     * Button button = new Button(this);
     * button.setText(label);
     * button.setAllCaps(false);
     * button.setTextSize(14f);
     * button.setTextColor(getResources().getColor(android.R.color.white));
     * button.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));
     * <p>
     * LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
     * LinearLayout.LayoutParams.WRAP_CONTENT,
     * LinearLayout.LayoutParams.WRAP_CONTENT
     * );
     * params.setMargins(8, 0, 8, 0);
     * button.setLayoutParams(params);
     * <p>
     * button.setOnClickListener(v -> {
     * ChatMessage userMessage = new ChatMessage(label, true);
     * adapter.addMessage(userMessage);
     * spremiPorukuUHistory(userMessage);
     * rvChat.scrollToPosition(messages.size() - 1);
     * <p>
     * clearQuickActions();
     * <p>
     * if ("go_to_cart".equals(actionId)) {
     * otvoriPregledNarudzbe();
     * return;
     * }
     * <p>
     * sendActionToAI(actionId, label);
     * });
     * <p>
     * layoutQuickActions.addView(button);
     * }
     * <p>
     * actionsScroll.setVisibility(View.VISIBLE);
     * }
     */

    private void showQuickActions(ArrayList<Map<String, String>> actions) {
        clearQuickActions();
    }

    private void sendModeToAI(String mode, String visibleLabel) {
        Map<String, Object> data = buildBasePayload();
        data.put("message", visibleLabel);
        data.put("action", "");
        data.put("mode", mode);

        Log.d("CHAT_FN", "Sending mode payload: " + data);

        btnSend.setEnabled(false);

        int loadingPosition = adapter.addLoadingMessage();
        rvChat.scrollToPosition(messages.size() - 1);

        functions.getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();

                    ParsedResponse parsed = parseResponse(result.getData());
                    applyResponse(parsed);
                })
                .addOnFailureListener(e -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();
                    clearQuickActions();

                    String msg = e.getMessage();

                    if (e instanceof FirebaseFunctionsException) {
                        FirebaseFunctionsException ffe = (FirebaseFunctionsException) e;
                        msg = getString(
                                R.string.chat_error_functions,
                                ffe.getCode().toString(),
                                ffe.getMessage(),
                                ffe.getDetails() != null ? ffe.getDetails().toString() : getString(R.string.chat_null)
                        );
                    }

                    ChatMessage errorMessage = new ChatMessage(msg, false);
                    adapter.addMessage(errorMessage);
                    spremiPorukuUHistory(errorMessage);
                    rvChat.scrollToPosition(messages.size() - 1);
                });
    }

    private void otvoriPregledNarudzbe() {
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        Intent intent = new Intent(ChatActivity.this, PregledNarudzbiActivity.class);
        intent.putExtra("tableNumber", tableNumber);
        intent.putExtra("restaurant", restaurant);
        intent.putExtra("qrToken", qrToken);
        startActivity(intent);
    }

    private ArrayList<Map<String, String>> withHomeActions(ArrayList<Map<String, String>> actions) {
        ArrayList<Map<String, String>> merged = new ArrayList<>();
        java.util.HashSet<String> ids = new java.util.HashSet<>();

        if (actions != null) {
            for (Map<String, String> action : actions) {
                if (action == null) continue;

                String id = action.get("id");
                if (id != null && !ids.contains(id)) {
                    merged.add(action);
                    ids.add(id);
                }
            }
        }

        if (!merged.isEmpty()) {
            return merged;
        }

        merged.add(makeAction("open_last_delivered_order", "Moja zadnja dostavljena narudžba", ids));
        merged.add(makeAction("open_last_any_order", "Moja zadnja narudžba", ids));
        merged.add(makeAction("open_personal_recommendations", "Preporuči mi nešto", ids));
        merged.add(makeAction("open_popular_items", "Što je popularno", ids));
        merged.add(makeAction("open_order_status", "Status narudžbe", ids));
        merged.add(makeAction("open_new_order", "Nova narudžba", ids));

        return merged;
    }

    private Map<String, String> makeAction(String id, String label, java.util.HashSet<String> ids) {
        if (ids.contains(id)) return null;

        Map<String, String> map = new HashMap<>();
        map.put("id", id);
        map.put("label", label);
        ids.add(id);
        return map;
    }

    private int extractQuantityFromOrder(String order) {
        try {
            String upper = order.toUpperCase();
            int start = upper.lastIndexOf("(X");
            int end = upper.lastIndexOf(")");

            if (start != -1 && end != -1 && end > start) {
                String quantityPart = order.substring(start + 2, end).trim();
                return Integer.parseInt(quantityPart);
            }
        } catch (Exception e) {
            Log.e("CHAT_REPEAT", "Greška pri čitanju količine iz stavke: " + order, e);
        }
        return 1;
    }

    private String formatOrderItemForDisplay(String order) {
        try {
            int quantity = extractQuantityFromOrder(order);

            int quantityIndex = order.lastIndexOf("(X");
            String base = quantityIndex != -1
                    ? order.substring(0, quantityIndex).trim()
                    : order.trim();

            return base + " (x" + quantity + ")";
        } catch (Exception e) {
            return order;
        }
    }

    private void dodajStavkeUKosaricu(ArrayList<String> items) {
        SharedPreferences preferences = getSharedPreferences("narudzba", MODE_PRIVATE);
        Gson gson = new Gson();

        String existingJson = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();

        ArrayList<String> currentOrders =
                existingJson == null ? new ArrayList<>() : gson.fromJson(existingJson, type);

        if (currentOrders == null) {
            currentOrders = new ArrayList<>();
        }

        currentOrders.addAll(items);

        int totalSelected = 0;
        for (String item : currentOrders) {
            totalSelected += extractQuantityFromOrder(item);
        }

        preferences.edit()
                .putString("narudzbe", gson.toJson(currentOrders))
                .putInt("total_selected", totalSelected)
                .apply();

        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        Intent intent = new Intent(ChatActivity.this, PregledNarudzbiActivity.class);
        intent.putExtra("tableNumber", tableNumber);
        intent.putExtra("restaurant", restaurant);
        intent.putExtra("qrToken", qrToken);
        startActivity(intent);
        finish();
    }

    private void dodajStavkeUKosaricuBezOtvaranja(ArrayList<String> items) {
        SharedPreferences preferences = getSharedPreferences("narudzba", MODE_PRIVATE);
        Gson gson = new Gson();

        String existingJson = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();

        ArrayList<String> currentOrders =
                existingJson == null ? new ArrayList<>() : gson.fromJson(existingJson, type);

        if (currentOrders == null) {
            currentOrders = new ArrayList<>();
        }

        currentOrders.addAll(items);

        int totalSelected = 0;
        for (String item : currentOrders) {
            totalSelected += extractQuantityFromOrder(item);
        }

        preferences.edit()
                .putString("narudzbe", gson.toJson(currentOrders))
                .putInt("total_selected", totalSelected)
                .apply();
    }

    private void potvrdiDodavanjeStavkiUKosaricu(ArrayList<String> items) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");
        View view = getLayoutInflater().inflate(R.layout.dialog_repeat_order, null);
        builder.setView(view);

        AlertDialog dialog = builder.create();
        dialog.setCancelable(true);
        dialog.show();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(
                    new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT)
            );
        }

        android.widget.TextView tvRepeatMessage = view.findViewById(R.id.tvRepeatMessage);
        android.widget.Button btnRepeatAdd = view.findViewById(R.id.btnRepeatAdd);
        android.widget.Button btnRepeatCancel = view.findViewById(R.id.btnRepeatCancel);

        if (items != null && !items.isEmpty()) {
            ArrayList<String> formattedItems = new ArrayList<>();
            for (String item : items) {
                formattedItems.add(formatOrderItemForDisplay(item));
            }

            tvRepeatMessage.setText(
                    nickname + ", želiš li dodati ove stavke u košaricu?\n\n" +
                            android.text.TextUtils.join("\n", formattedItems)
            );
        }

        btnRepeatAdd.setOnClickListener(v -> {
            dialog.dismiss();
            dodajStavkeUKosaricu(items);
        });

        btnRepeatCancel.setOnClickListener(v -> dialog.dismiss());
    }

    private ArrayList<Map<String, Object>> buildChatHistory() {
        ArrayList<Map<String, Object>> history = new ArrayList<>();

        int endExclusive = messages.size();
        int start = Math.max(0, endExclusive - 15);

        for (int i = start; i < endExclusive; i++) {
            ChatMessage msg = messages.get(i);

            Map<String, Object> item = new HashMap<>();
            item.put("role", msg.isUser() ? "user" : "assistant");
            item.put("text", msg.getText());

            if (msg.getMetadata() != null) {
                item.put("metadata", msg.getMetadata());
            }

            history.add(item);
        }

        return history;
    }

    private static class ParsedResponse {
        String message;
        String type;
        Map<String, Object> metadata = new HashMap<>();
        ArrayList<String> items = new ArrayList<>();
        ArrayList<Map<String, String>> actions = new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private ParsedResponse parseResponse(Object rawData) {
        ParsedResponse parsed = new ParsedResponse();

        if (!(rawData instanceof Map<?, ?>)) {
            return parsed;
        }

        Map<String, Object> response = (Map<String, Object>) rawData;

        parsed.message = (String) response.get("message");
        parsed.type = (String) response.get("type");

        Object metadataObj = response.get("metadata");
        if (metadataObj instanceof Map<?, ?>) {
            parsed.metadata = new HashMap<>();
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) metadataObj).entrySet()) {
                if (entry.getKey() instanceof String) {
                    parsed.metadata.put((String) entry.getKey(), entry.getValue());
                }
            }
        }

        Object itemsObj = response.get("items");
        if (itemsObj instanceof List<?>) {
            for (Object item : (List<?>) itemsObj) {
                if (item instanceof String) {
                    parsed.items.add((String) item);
                }
            }
        }

        Object actionsObj = response.get("actions");
        if (actionsObj instanceof List<?>) {
            for (Object actionObj : (List<?>) actionsObj) {
                if (actionObj instanceof Map<?, ?>) {
                    Object idObj = ((Map<?, ?>) actionObj).get("id");
                    Object labelObj = ((Map<?, ?>) actionObj).get("label");

                    if (idObj instanceof String && labelObj instanceof String) {
                        Map<String, String> actionMap = new HashMap<>();
                        actionMap.put("id", (String) idObj);
                        actionMap.put("label", (String) labelObj);
                        parsed.actions.add(actionMap);
                    }
                }
            }
        }

        return parsed;
    }

    private void applyResponse(ParsedResponse parsed) {
        String message = parsed.message;
        String type = parsed.type;

        if (message == null || message.isEmpty()) {
            message = getString(R.string.chat_no_response);
        }

        ChatMessage aiMessage = new ChatMessage(message, false);
        aiMessage.setMetadata(parsed.metadata);
        adapter.addMessage(aiMessage);
        spremiPorukuUHistory(aiMessage);
        rvChat.scrollToPosition(messages.size() - 1);

        if (("repeat_last_order".equals(type)
                || "create_order_draft".equals(type)
                || "repeat_last_order_submit".equals(type)
                || "repeat_last_order_to_cart".equals(type)
                || "repeat_last_any_order_submit".equals(type)
                || "repeat_last_any_order_to_cart".equals(type)
                || "repeat_history_order_submit".equals(type)
                || "repeat_history_order_to_cart".equals(type))
                && parsed.items != null
                && !parsed.items.isEmpty()) {

            pendingAction = type;
            pendingItems.clear();
            pendingItems.addAll(parsed.items);
        } else {
            pendingAction = null;
            pendingItems.clear();
        }

        clearQuickActions();

        if (("recommendation_added".equals(type)
                || "menu_item_added".equals(type)
                || "chat_order_added".equals(type)
                || "history_order_filtered".equals(type))
                && parsed.items != null
                && !parsed.items.isEmpty()) {
            dodajStavkeUKosaricuBezOtvaranja(new ArrayList<>(parsed.items));
        }
    }

    private void postaviStavkeUKosaricu(ArrayList<String> items, boolean otvoriPregled) {
        SharedPreferences preferences = getSharedPreferences("narudzba", MODE_PRIVATE);
        Gson gson = new Gson();

        ArrayList<String> noveNarudzbe = new ArrayList<>();
        if (items != null) {
            noveNarudzbe.addAll(items);
        }

        int totalSelected = 0;
        for (String item : noveNarudzbe) {
            totalSelected += extractQuantityFromOrder(item);
        }

        preferences.edit()
                .putString("narudzbe", gson.toJson(noveNarudzbe))
                .putInt("total_selected", totalSelected)
                .apply();

        if (otvoriPregled) {
            int tableNumber = getIntent().getIntExtra("tableNumber", -1);
            String restaurant = getIntent().getStringExtra("restaurant");
            String qrToken = getIntent().getStringExtra("qrToken");

            Intent intent = new Intent(ChatActivity.this, PregledNarudzbiActivity.class);
            intent.putExtra("tableNumber", tableNumber);
            intent.putExtra("restaurant", restaurant);
            intent.putExtra("qrToken", qrToken);
            startActivity(intent);
            finish();
        }
    }

    private void showYesNoActionsForRepeatToCart() {
        clearQuickActions();

        if (layoutQuickActions == null || actionsScroll == null) {
            return;
        }

        Button btnDa = new Button(this);
        btnDa.setText("Da");
        btnDa.setAllCaps(false);
        btnDa.setTextSize(14f);
        btnDa.setTextColor(getResources().getColor(android.R.color.white));
        btnDa.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));

        LinearLayout.LayoutParams daParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        daParams.setMargins(8, 0, 8, 0);
        btnDa.setLayoutParams(daParams);

        btnDa.setOnClickListener(v -> {
            clearQuickActions();

            ChatMessage userMessage = new ChatMessage("Da", true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            ArrayList<String> itemsToAdd = new ArrayList<>(pendingItems);

            pendingAction = null;
            pendingItems.clear();

            ChatMessage aiMessage = new ChatMessage(
                    "Maknuo sam prethodne stavke iz košarice i prebacio odabranu narudžbu za prilagodbu.",
                    false
            );
            adapter.addMessage(aiMessage);
            spremiPorukuUHistory(aiMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            postaviStavkeUKosaricu(itemsToAdd, true);
        });

        Button btnNe = new Button(this);
        btnNe.setText("Ne");
        btnNe.setAllCaps(false);
        btnNe.setTextSize(14f);
        btnNe.setTextColor(getResources().getColor(android.R.color.white));
        btnNe.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));

        LinearLayout.LayoutParams neParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        neParams.setMargins(8, 0, 8, 0);
        btnNe.setLayoutParams(neParams);

        btnNe.setOnClickListener(v -> {
            clearQuickActions();

            ChatMessage userMessage = new ChatMessage("Ne", true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            ChatMessage aiMessage = new ChatMessage(
                    "U redu, neću prebaciti prošlu narudžbu u košaricu.",
                    false
            );
            adapter.addMessage(aiMessage);
            spremiPorukuUHistory(aiMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            pendingAction = null;
            pendingItems.clear();

            refreshHomeActionsOnly();
        });

        layoutQuickActions.addView(btnDa);
        layoutQuickActions.addView(btnNe);

        actionsScroll.setVisibility(View.VISIBLE);
    }

    private void showYesNoActionsForRepeatSubmit() {
        clearQuickActions();

        if (layoutQuickActions == null || actionsScroll == null) {
            return;
        }

        Button btnDa = new Button(this);
        btnDa.setText("Da");
        btnDa.setAllCaps(false);
        btnDa.setTextSize(14f);
        btnDa.setTextColor(getResources().getColor(android.R.color.white));
        btnDa.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));

        LinearLayout.LayoutParams daParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        daParams.setMargins(8, 0, 8, 0);
        btnDa.setLayoutParams(daParams);

        btnDa.setOnClickListener(v -> {
            clearQuickActions();

            ChatMessage userMessage = new ChatMessage("Da", true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            if (!pendingItems.isEmpty()) {
                posaljiNarudzbuDirektnoFirebase(new ArrayList<>(pendingItems));
            }
        });

        Button btnNe = new Button(this);
        btnNe.setText("Ne");
        btnNe.setAllCaps(false);
        btnNe.setTextSize(14f);
        btnNe.setTextColor(getResources().getColor(android.R.color.white));
        btnNe.setBackgroundTintList(ColorStateList.valueOf(Color.BLACK));

        LinearLayout.LayoutParams neParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        neParams.setMargins(8, 0, 8, 0);
        btnNe.setLayoutParams(neParams);

        btnNe.setOnClickListener(v -> {
            clearQuickActions();

            ChatMessage userMessage = new ChatMessage("Ne", true);
            adapter.addMessage(userMessage);
            spremiPorukuUHistory(userMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            ChatMessage aiMessage = new ChatMessage(
                    "U redu, odustali smo od ponovnog slanja prošle narudžbe.",
                    false
            );
            adapter.addMessage(aiMessage);
            spremiPorukuUHistory(aiMessage);
            rvChat.scrollToPosition(messages.size() - 1);

            pendingAction = null;
            pendingItems.clear();

            refreshHomeActionsOnly();
        });

        layoutQuickActions.addView(btnDa);
        layoutQuickActions.addView(btnNe);

        actionsScroll.setVisibility(View.VISIBLE);
    }

    private void posaljiNarudzbuDirektnoFirebase(ArrayList<String> stavkeZaSlanje) {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        String currentUserId = currentUser != null ? currentUser.getUid() : null;

        if (currentUserId == null) {
            Toast.makeText(
                    ChatActivity.this,
                    "Korisnik nije prijavljen. Pokušajte ponovno.",
                    Toast.LENGTH_SHORT
            ).show();
            refreshHomeActionsOnly();
            return;
        }

        if (stavkeZaSlanje == null || stavkeZaSlanje.isEmpty()) {
            Toast.makeText(
                    ChatActivity.this,
                    "Nema stavki za slanje.",
                    Toast.LENGTH_SHORT
            ).show();
            refreshHomeActionsOnly();
            return;
        }

        DatabaseReference databaseRef = FirebaseDatabase.getInstance().getReference();
        DatabaseReference narudzbeRef = databaseRef.child("narudzbe");
        DatabaseReference counterRef = databaseRef.child("SVEUKUPNO_IZDANO_NARUDZBI");

        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");
        String konobar = getIntent().getStringExtra("selectedUser");
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);

        if (tableNumber == -1) {
            Toast.makeText(
                    ChatActivity.this,
                    "Broj stola nedostaje.",
                    Toast.LENGTH_SHORT
            ).show();
            refreshHomeActionsOnly();
            return;
        }

        ChatMessage loadingMessage = new ChatMessage("Šaljem narudžbu u kuhinju...", false);
        adapter.addMessage(loadingMessage);
        spremiPorukuUHistory(loadingMessage);
        rvChat.scrollToPosition(messages.size() - 1);

        counterRef.runTransaction(new Transaction.Handler() {
            @NonNull
            @Override
            public Transaction.Result doTransaction(@NonNull MutableData currentData) {
                Integer currentCounter = currentData.getValue(Integer.class);
                if (currentCounter == null) {
                    currentCounter = 0;
                }
                currentData.setValue(currentCounter + 1);
                return Transaction.success(currentData);
            }

            @Override
            public void onComplete(@Nullable DatabaseError error,
                                   boolean committed,
                                   @Nullable DataSnapshot currentData) {
                if (!(committed && currentData != null && currentData.getValue(Integer.class) != null)) {
                    ChatMessage errorMessage = new ChatMessage(
                            "Dogodila se greška pri slanju narudžbe.",
                            false
                    );
                    adapter.addMessage(errorMessage);
                    spremiPorukuUHistory(errorMessage);
                    rvChat.scrollToPosition(messages.size() - 1);
                    refreshHomeActionsOnly();
                    return;
                }

                int newCounter = currentData.getValue(Integer.class);
                String noviKljuc = String.format(Locale.getDefault(), "Narudzba_%03d", newCounter);

                Map<String, Object> narudzba = new HashMap<>();
                narudzba.put("stavke", stavkeZaSlanje);
                narudzba.put("vrijeme",
                        new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                narudzba.put("createdAt", System.currentTimeMillis());
                narudzba.put("lastUpdated", System.currentTimeMillis());
                narudzba.put("konobar", konobar);
                narudzba.put("brojStola", tableNumber);
                narudzba.put("restaurant", restaurant);
                narudzba.put("qrToken", qrToken);
                narudzba.put("userId", currentUserId);
                narudzba.put("status", "Narudžba zaprimljena");
                narudzba.put("korak", 1);
                narudzba.put("ukupnoKoraka", 4);
                narudzba.put("napomenaZaGosta", "Kuhinja je zaprimila vašu narudžbu");

                narudzbeRef.child(noviKljuc).setValue(narudzba).addOnCompleteListener(task -> {
                    pendingAction = null;
                    pendingItems.clear();

                    if (task.isSuccessful()) {
                        ChatMessage doneMessage = new ChatMessage(
                                "Narudžba je uspješno poslana u kuhinju.",
                                false
                        );
                        adapter.addMessage(doneMessage);
                        spremiPorukuUHistory(doneMessage);
                        rvChat.scrollToPosition(messages.size() - 1);

                        refreshHomeActionsOnly();
                    } else {
                        ChatMessage errorMessage = new ChatMessage(
                                "Dogodila se greška pri slanju narudžbe.",
                                false
                        );
                        adapter.addMessage(errorMessage);
                        spremiPorukuUHistory(errorMessage);
                        rvChat.scrollToPosition(messages.size() - 1);

                        refreshHomeActionsOnly();
                    }
                });
            }
        });
    }

    private Map<String, Object> buildBasePayload() {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        String currentUserId = currentUser != null ? currentUser.getUid() : null;

        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");

        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        Map<String, Object> data = new HashMap<>();
        data.put("userId", currentUserId);
        data.put("nickname", nickname);
        data.put("tableNumber", tableNumber);
        data.put("restaurant", restaurant);
        data.put("qrToken", qrToken);
        data.put("history", buildChatHistory());
        SharedPreferences cartPrefs = getSharedPreferences("narudzba", MODE_PRIVATE);
        String cartJson = cartPrefs.getString("narudzbe", "[]");

        Type cartType = new TypeToken<ArrayList<String>>() {
        }.getType();
        ArrayList<String> cartItems = new Gson().fromJson(cartJson, cartType);

        if (cartItems == null) {
            cartItems = new ArrayList<>();
        }

        data.put("cartItems", cartItems);


        return data;
    }

    @SuppressWarnings("unchecked")
    private void sendActionToAI(String actionId, String visibleLabel) {
        Map<String, Object> data = buildBasePayload();
        data.put("message", "");
        data.put("action", actionId);
        data.put("mode", activeMode);

        Log.d("CHAT_FN", "Sending action payload: " + data);

        btnSend.setEnabled(false);

        int loadingPosition = adapter.addLoadingMessage();
        rvChat.scrollToPosition(messages.size() - 1);

        functions.getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();

                    ParsedResponse parsed = parseResponse(result.getData());
                    applyResponse(parsed);
                })
                .addOnFailureListener(e -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();
                    clearQuickActions();

                    String msg = e.getMessage();

                    if (e instanceof FirebaseFunctionsException) {
                        FirebaseFunctionsException ffe = (FirebaseFunctionsException) e;
                        FirebaseFunctionsException.Code code = ffe.getCode();
                        Object details = ffe.getDetails();

                        msg = getString(
                                R.string.chat_error_functions,
                                code.toString(),
                                ffe.getMessage(),
                                details != null ? details.toString() : getString(R.string.chat_null)
                        );

                        Log.e("CHAT_FN", msg, e);
                    } else {
                        Log.e("CHAT_FN", "Non-functions error: " + e.getMessage(), e);
                    }

                    ChatMessage errorMessage = new ChatMessage(msg, false);
                    adapter.addMessage(errorMessage);
                    spremiPorukuUHistory(errorMessage);
                    rvChat.scrollToPosition(messages.size() - 1);
                });
    }

    private void sendToAI(String userText) {
        Map<String, Object> data = buildBasePayload();
        data.put("message", userText);
        data.put("action", "");
        data.put("mode", activeMode);

        Log.d("CHAT_FN", "Sending chat payload: " + data);

        btnSend.setEnabled(false);
        clearQuickActions();

        int loadingPosition = adapter.addLoadingMessage();
        rvChat.scrollToPosition(messages.size() - 1);

        functions.getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();

                    ParsedResponse parsed = parseResponse(result.getData());
                    applyResponse(parsed);
                })
                .addOnFailureListener(e -> {
                    btnSend.setEnabled(true);
                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingItems.clear();
                    clearQuickActions();

                    String msg = e.getMessage();

                    if (e instanceof FirebaseFunctionsException) {
                        FirebaseFunctionsException ffe = (FirebaseFunctionsException) e;
                        FirebaseFunctionsException.Code code = ffe.getCode();
                        Object details = ffe.getDetails();

                        msg = getString(
                                R.string.chat_error_functions,
                                code.toString(),
                                ffe.getMessage(),
                                details != null ? details.toString() : getString(R.string.chat_null)
                        );

                        Log.e("CHAT_FN", msg, e);
                    } else {
                        Log.e("CHAT_FN", "Non-functions error: " + e.getMessage(), e);
                    }

                    ChatMessage errorMessage = new ChatMessage(msg, false);
                    adapter.addMessage(errorMessage);
                    spremiPorukuUHistory(errorMessage);
                    rvChat.scrollToPosition(messages.size() - 1);
                });
    }
}