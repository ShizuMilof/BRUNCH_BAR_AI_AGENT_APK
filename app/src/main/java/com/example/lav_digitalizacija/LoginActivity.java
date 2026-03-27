package com.example.lav_digitalizacija;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.FirebaseApp;

public class LoginActivity extends AppCompatActivity {

    private Button buttonChooseWaiter;
    private String meniPozicija;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        meniPozicija = getIntent().getStringExtra("meniPozicija");

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        FirebaseApp.initializeApp(this);

        buttonChooseWaiter = findViewById(R.id.buttonChooseWaiter);
        buttonChooseWaiter.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, QrScannerActivity.class);
            intent.putExtra("meniPozicija", meniPozicija);
            startActivity(intent);
        });

    }

    @Override
    public void onBackPressed() {
        moveTaskToBack(false);
    }
}