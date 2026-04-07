package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.ChatMessage;
import com.example.lav_digitalizacija.view.adapter.ChatAdapter;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.common.reflect.TypeToken;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.gson.Gson;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatActivity extends AppCompatActivity {

    private RecyclerView rvChat;
    private EditText etMessage;
    private Button btnSend;

    private FirebaseFunctions functions;

    private ChatAdapter adapter;

    private DatabaseReference chatHistoryRef;
    private String userId;

    private String pendingAction = null;
    private ArrayList<String> pendingRepeatItems = new ArrayList<>();
    private final List<ChatMessage> messages = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);
        int st = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(this);

        rvChat = findViewById(R.id.rvChat);
        etMessage = findViewById(R.id.etMessage);
        btnSend = findViewById(R.id.btnSend);

        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        userId = currentUser != null ? currentUser.getUid() : null;

        if (userId != null) {
            chatHistoryRef = FirebaseDatabase.getInstance()
                    .getReference("chat_history")
                    .child(userId);
        }

        functions = FirebaseFunctions.getInstance("europe-west1");

        adapter = new ChatAdapter(messages);

        LinearLayoutManager lm = new LinearLayoutManager(this);
        lm.setStackFromEnd(true);
        rvChat.setLayoutManager(lm);
        rvChat.setAdapter(adapter);

        ucitajZadnjePoruke();

        // Kad se ponovno uđe u chat, ne nastavljaj stari confirmation flow
        pendingAction = null;
        pendingRepeatItems.clear();

        btnSend.setOnClickListener(v -> {
            String text = etMessage.getText().toString().trim();
            if (text.isEmpty()) return;

            // Ako postoji aktivan pending flow, obradi potvrdu/odbijanje lokalno
            if (pendingAction != null) {
                if (jePotvrda(text)) {
                    ChatMessage userMessage = new ChatMessage(text, true);
                    adapter.addMessage(userMessage);
                    spremiPorukuUHistory(userMessage);
                    rvChat.scrollToPosition(messages.size() - 1);

                    if ("repeat_last_order".equals(pendingAction)) {
                        potvrdiDodavanjeProsleNarudzbe(new ArrayList<>(pendingRepeatItems));
                    }

                    pendingAction = null;
                    pendingRepeatItems.clear();
                    etMessage.setText("");
                    return;
                }

                if (jeOdbijanje(text)) {
                    ChatMessage userMessage = new ChatMessage(text, true);
                    adapter.addMessage(userMessage);
                    spremiPorukuUHistory(userMessage);
                    rvChat.scrollToPosition(messages.size() - 1);

                    ChatMessage aiMessage = new ChatMessage(
                            "U redu, neću dodati prošlu narudžbu.",
                            false
                    );
                    adapter.addMessage(aiMessage);
                    spremiPorukuUHistory(aiMessage);
                    rvChat.scrollToPosition(messages.size() - 1);

                    pendingAction = null;
                    pendingRepeatItems.clear();
                    etMessage.setText("");
                    return;
                }
            }

            // Ako nema aktivnog flowa, a korisnik napiše samo potvrdu,
            // nemoj to slati AI-u jer vodi u petlju sa starim porukama
            if (jePotvrda(text) && pendingAction == null) {
                ChatMessage userMessage = new ChatMessage(text, true);
                adapter.addMessage(userMessage);
                spremiPorukuUHistory(userMessage);
                rvChat.scrollToPosition(messages.size() - 1);
                etMessage.setText("");

                ChatMessage aiMessage = new ChatMessage(
                        "Ako želiš ponovno dodati prošlu narudžbu, upiši točno: Naruci mi kao prosli put.",
                        false
                );
                adapter.addMessage(aiMessage);
                spremiPorukuUHistory(aiMessage);
                rvChat.scrollToPosition(messages.size() - 1);
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

    private boolean jePotvrda(String text) {
        String t = text.toLowerCase().trim();
        return t.equals("da") ||
                t.equals("moze") ||
                t.equals("može") ||
                t.equals("ok") ||
                t.equals("okej") ||
                t.equals("yes");
    }

    private boolean jeOdbijanje(String text) {
        String t = text.toLowerCase().trim();
        return t.equals("ne") ||
                t.equals("nemoj") ||
                t.equals("odustani") ||
                t.equals("cancel");
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
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");

        if (messages.isEmpty()) {
            ChatMessage welcomeMessage = new ChatMessage(
                    "Bok, " + nickname + "! " + getString(R.string.chat_welcome),
                    false
            );
            messages.add(welcomeMessage);
            adapter.notifyDataSetChanged();
            rvChat.scrollToPosition(messages.size() - 1);
        }
    }

    private void spremiPorukuUHistory(ChatMessage message) {
        if (chatHistoryRef == null || message == null) return;

        String key = chatHistoryRef.push().getKey();
        if (key != null) {
            chatHistoryRef.child(key).setValue(message);
        }
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

    private void dodajProsleStavkeUKosaricu(ArrayList<String> repeatItems) {
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

        currentOrders.addAll(repeatItems);

        int totalSelected = 0;
        for (String item : currentOrders) {
            totalSelected += extractQuantityFromOrder(item);
        }

        preferences.edit()
                .putString("narudzbe", gson.toJson(currentOrders))
                .putInt("total_selected", totalSelected)
                .apply();

        adapter.addMessage(new ChatMessage(
                "Dodao sam prošlu narudžbu u tvoju košaricu i otvaram pregled.",
                false
        ));
        rvChat.scrollToPosition(messages.size() - 1);

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


    private ArrayList<Map<String, Object>> buildChatHistory() {
        ArrayList<Map<String, Object>> history = new ArrayList<>();

        int endExclusive = Math.max(0, messages.size() - 1);
        int start = Math.max(0, endExclusive - 15);

        for (int i = start; i < endExclusive; i++) {
            ChatMessage msg = messages.get(i);

            Map<String, Object> item = new HashMap<>();
            item.put("role", msg.isUser() ? "user" : "assistant");
            item.put("text", msg.getText());

            history.add(item);
        }

        return history;
    }

    private void potvrdiDodavanjeProsleNarudzbe(ArrayList<String> repeatItems) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");
        android.view.View view = getLayoutInflater().inflate(R.layout.dialog_repeat_order, null);
        builder.setView(view);

        AlertDialog dialog = builder.create();
        dialog.setCancelable(true);
        dialog.show();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(
                    new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT)
            );
        }

        android.widget.TextView tvRepeatMessage = view.findViewById(R.id.tvRepeatMessage);
        android.widget.Button btnRepeatAdd = view.findViewById(R.id.btnRepeatAdd);
        android.widget.Button btnRepeatCancel = view.findViewById(R.id.btnRepeatCancel);

        if (repeatItems != null && !repeatItems.isEmpty()) {
            tvRepeatMessage.setText(
                    nickname + ", želiš li dodati ovu narudžbu u košaricu?\n\n" +
                            android.text.TextUtils.join("\n", repeatItems)
            );
        }

        btnRepeatAdd.setOnClickListener(v -> {
            dialog.dismiss();
            dodajProsleStavkeUKosaricu(repeatItems);
        });

        btnRepeatCancel.setOnClickListener(v -> dialog.dismiss());
    }

    private void sendToAI(String userText) {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        String userId = currentUser != null ? currentUser.getUid() : null;

        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");

        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        Map<String, Object> data = new HashMap<>();
        data.put("message", userText);
        data.put("userId", userId);
        data.put("nickname", nickname);
        data.put("tableNumber", tableNumber);
        data.put("restaurant", restaurant);
        data.put("qrToken", qrToken);
        data.put("history", buildChatHistory());

        Log.d("CHAT_FN", "Sending chat payload: " + data);

        btnSend.setEnabled(false);

        int loadingPosition = adapter.addLoadingMessage();
        rvChat.scrollToPosition(messages.size() - 1);

        functions
                .getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {
                    btnSend.setEnabled(true);

                    adapter.removeMessage(loadingPosition);
                    pendingAction = null;
                    pendingRepeatItems.clear();
                    Map<String, Object> response =
                            (Map<String, Object>) result.getData();

                    String answer = null;
                    String action = null;
                    ArrayList<String> repeatItems = new ArrayList<>();

                    if (response != null) {
                        answer = (String) response.get("answer");
                        action = (String) response.get("action");
                        Log.d("CHAT_FN", "Response: " + response.toString());

                        Object repeatItemsObj = response.get("repeatItems");
                        if (repeatItemsObj instanceof List<?>) {
                            for (Object item : (List<?>) repeatItemsObj) {
                                if (item instanceof String) {
                                    repeatItems.add((String) item);
                                }
                            }
                        }
                    }

                    if (answer == null || answer.isEmpty()) {
                        answer = getString(R.string.chat_no_response);
                    }

                    ChatMessage aiMessage = new ChatMessage(answer, false);
                    adapter.addMessage(aiMessage);
                    spremiPorukuUHistory(aiMessage);
                    rvChat.scrollToPosition(messages.size() - 1);

                    if ("repeat_last_order".equals(action) && !repeatItems.isEmpty()) {
                        pendingAction = "repeat_last_order";
                        pendingRepeatItems.clear();
                        pendingRepeatItems.addAll(repeatItems);
                    } else {
                        pendingAction = null;
                        pendingRepeatItems.clear();
                    }
                })
                .addOnFailureListener(e -> {
                    btnSend.setEnabled(true);

                    adapter.removeMessage(loadingPosition);

                    pendingAction = null;
                    pendingRepeatItems.clear();

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