package com.example.lav_digitalizacija;

import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.gms.common.GoogleApiAvailability;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;

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
    private final List<ChatMessage> messages = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);
        int st = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(this);
        Log.d("GMS_CHECK", "status=" + st);

        rvChat = findViewById(R.id.rvChat);
        etMessage = findViewById(R.id.etMessage);
        btnSend = findViewById(R.id.btnSend);

        functions = FirebaseFunctions.getInstance("europe-west1");

        adapter = new ChatAdapter(messages);

        LinearLayoutManager lm = new LinearLayoutManager(this);
        lm.setStackFromEnd(true);
        rvChat.setLayoutManager(lm);
        rvChat.setAdapter(adapter);

        adapter.addMessage(new ChatMessage(
                getString(R.string.chat_welcome),
                false
        ));

        rvChat.scrollToPosition(messages.size() - 1);

        btnSend.setOnClickListener(v -> {
            String text = etMessage.getText().toString().trim();
            if (text.isEmpty()) return;

            adapter.addMessage(new ChatMessage(text, true));
            rvChat.scrollToPosition(messages.size() - 1);
            etMessage.setText("");

            sendToAI(text);
        });
    }

    private void sendToAI(String userText) {

        Map<String, Object> data = new HashMap<>();
        data.put("message", userText);

        functions
                .getHttpsCallable("chatWaiter")
                .call(data)
                .addOnSuccessListener(result -> {

                    Map<String, Object> response =
                            (Map<String, Object>) result.getData();

                    String answer = null;

                    if (response != null) {
                        answer = (String) response.get("answer");
                    }

                    if (answer == null || answer.isEmpty()) {
                        answer = getString(R.string.chat_no_response);
                    }

                    adapter.addMessage(new ChatMessage(answer, false));
                    rvChat.scrollToPosition(messages.size() - 1);
                })
                .addOnFailureListener(e -> {
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

                    adapter.addMessage(new ChatMessage(msg, false));
                    rvChat.scrollToPosition(messages.size() - 1);
                });
    }
}