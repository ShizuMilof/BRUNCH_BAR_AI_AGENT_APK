package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.example.lav_digitalizacija.R;

import java.util.ArrayList;

public class PotvrdaNarudzbeActivity extends AppCompatActivity {

    private TextView txtNarudzbaDetalji;
    private TextView txtPoruka;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_potvrda_narudzbe);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        txtNarudzbaDetalji = findViewById(R.id.txtNarudzbaDetalji);
        txtPoruka = findViewById(R.id.txtPoruka);

        ArrayList<String> stavkeNarudzbe = getIntent().getStringArrayListExtra("stavkeNarudzbe");
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");
        String narudzbaId = getIntent().getStringExtra("narudzbaId");

        if (stavkeNarudzbe != null && !stavkeNarudzbe.isEmpty()) {
            StringBuilder builder = new StringBuilder();
            for (String stavka : stavkeNarudzbe) {
                builder.append("• ").append(stavka).append("\n");
            }
            txtNarudzbaDetalji.setText(builder.toString().trim());
        }

        txtPoruka.setText("Bit ćete preusmjereni na stranicu za odabir jela i pića.\n\nVaše narudžbe možete pratiti u odjeljku za aktivne narudžbe.");

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent = new Intent(PotvrdaNarudzbeActivity.this, OdabirJelaPicaActivity.class);
            intent.putExtra("tableNumber", tableNumber);
            intent.putExtra("restaurant", restaurant);
            intent.putExtra("qrToken", qrToken);
            intent.putExtra("highlightOrdersButton", true);
            startActivity(intent);
            finish();
        }, 6000);
    }
}