package com.example.lav_digitalizacija;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.FirebaseApp;

public class LoginActivity extends AppCompatActivity {

    private Button buttonQrCode;
    private ImageView imageViewBackground;
    private static final String ADMIN_KOD = "1234";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        FirebaseApp.initializeApp(this);
        imageViewBackground = findViewById(R.id.imageViewBackground);
        imageViewBackground.setOnClickListener(v -> prikaziAdminLoginDialog());
        buttonQrCode = findViewById(R.id.buttonQrCode);
        buttonQrCode.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, QrScannerActivity.class);
            startActivity(intent);
        });

    }

    private void prikaziAdminLoginDialog() {
        final android.widget.EditText input = new android.widget.EditText(this);
        input.setHint("Unesite admin kod");
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT |
                android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        
        androidx.appcompat.app.AlertDialog.Builder builder =
                new androidx.appcompat.app.AlertDialog.Builder(this);

        builder.setTitle("Admin pristup");
        builder.setMessage("Za ulazak u kuhinju unesite kod.");
        builder.setView(input);

        builder.setPositiveButton("Ulaz", (dialog, which) -> {
            String uneseniKod = input.getText().toString().trim();

            if (ADMIN_KOD.equals(uneseniKod)) {
                Intent intent = new Intent(LoginActivity.this, KuhinjaActivity.class);
                startActivity(intent);
            } else {
                Toast.makeText(LoginActivity.this,
                        "Pogrešan admin kod",
                        Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton("Odustani", (dialog, which) -> dialog.dismiss());
        builder.show();
    }

    @Override
    public void onBackPressed() {
        moveTaskToBack(false);
    }
}