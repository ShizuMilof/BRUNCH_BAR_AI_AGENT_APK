package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.example.lav_digitalizacija.R;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class LoginActivity extends AppCompatActivity {

    private Button buttonQrCode;
    private ImageView imageViewBackground;
    private static final String ADMIN_KOD = "1234";
    private static final String TAG = "LoginActivity";

    private FirebaseAuth auth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        FirebaseApp.initializeApp(this);
        auth = FirebaseAuth.getInstance();

        imageViewBackground = findViewById(R.id.imageViewBackground);
        buttonQrCode = findViewById(R.id.buttonQrCode);

        buttonQrCode.setEnabled(false);

        prijaviAnonimnoAkoTreba();

        imageViewBackground.setOnClickListener(v -> prikaziAdminLoginDialog());

        buttonQrCode.setOnClickListener(v -> {
            FirebaseUser currentUser = auth.getCurrentUser();

            if (currentUser == null) {
                Toast.makeText(
                        LoginActivity.this,
                        "Pričekajte trenutak, pripremamo aplikaciju...",
                        Toast.LENGTH_SHORT
                ).show();
                return;
            }

            Intent intent = new Intent(LoginActivity.this, QrScannerActivity.class);
            startActivity(intent);
        });
    }

    private void provjeriNickname() {
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", null);

        if (nickname == null || nickname.trim().isEmpty()) {
            prikaziNicknameDialog();
        }
    }

    private void prikaziNicknameDialog() {
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);

        View view = getLayoutInflater().inflate(R.layout.dialog_nickname, null);
        builder.setView(view);

        android.app.AlertDialog dialog = builder.create();
        dialog.setCancelable(false);
        dialog.show();

        EditText etNickname = view.findViewById(R.id.etNickname);
        Button btnSave = view.findViewById(R.id.btnSaveNickname);

        btnSave.setOnClickListener(v -> {
            String nickname = etNickname.getText().toString().trim();

            if (nickname.isEmpty()) {
                etNickname.setError("Unesi ime");
                return;
            }

            if (nickname.length() > 15) {
                nickname = nickname.substring(0, 15);
            }

            SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
            prefs.edit().putString("nickname", nickname).apply();

            dialog.dismiss();
        });
    }

    private void prijaviAnonimnoAkoTreba() {
        FirebaseUser currentUser = auth.getCurrentUser();

        if (currentUser != null) {
            Log.d(TAG, "Korisnik već postoji: " + currentUser.getUid());
            buttonQrCode.setEnabled(true);
            provjeriNickname();
            return;
        }

        auth.signInAnonymously()
                .addOnCompleteListener(this, task -> {
                    if (task.isSuccessful()) {
                        FirebaseUser user = auth.getCurrentUser();
                        if (user != null) {
                            Log.d(TAG, "Anonimna prijava uspješna. UID: " + user.getUid());
                        }
                        buttonQrCode.setEnabled(true);
                        provjeriNickname();
                    } else {
                        Log.e(TAG, "Anonimna prijava nije uspjela", task.getException());
                        Toast.makeText(
                                LoginActivity.this,
                                "Greška pri anonimnoj prijavi.",
                                Toast.LENGTH_SHORT
                        ).show();
                    }
                });
    }

    private void prikaziAdminLoginDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);

        View view = getLayoutInflater().inflate(R.layout.dialog_admin_login, null);
        builder.setView(view);

        AlertDialog dialog = builder.create();
        dialog.setCancelable(true);
        dialog.show();

        EditText etCode = view.findViewById(R.id.etAdminCode);
        Button btnLogin = view.findViewById(R.id.btnAdminLogin);
        Button btnCancel = view.findViewById(R.id.btnCancel);

        // lijepa pozadina (rounded bez bijelog okvira)
        dialog.getWindow().setBackgroundDrawable(
                new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT)
        );

        // fokus i tipkovnica
        etCode.requestFocus();
        dialog.getWindow().setSoftInputMode(
                WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
        );

        btnLogin.setOnClickListener(v -> {
            String uneseniKod = etCode.getText().toString().trim();

            if (uneseniKod.isEmpty()) {
                etCode.setError("Unesi kod");
                return;
            }

            if (ADMIN_KOD.equals(uneseniKod)) {
                dialog.dismiss();

                Intent intent = new Intent(LoginActivity.this, KuhinjaActivity.class);
                startActivity(intent);
            } else {
                etCode.setError("Pogrešan kod");
            }
        });

        btnCancel.setOnClickListener(v -> dialog.dismiss());
    }

    @Override
    public void onBackPressed() {
        moveTaskToBack(false);
    }
}