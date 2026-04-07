package com.example.lav_digitalizacija.view.activity;

import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.lav_digitalizacija.R;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import java.util.HashMap;
import java.util.Map;

public class AzuriranjeNarudzbeActivity extends AppCompatActivity {

    private TextView txtNarudzbaId;
    private Button btnZaprimljeno;
    private Button btnIzrada;
    private Button btnPriprema;
    private Button btnStize;
    private Button btnDostavljeno;

    private String narudzbaId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_azuriranje_narudzbe);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        txtNarudzbaId = findViewById(R.id.txtNarudzbaId);
        btnZaprimljeno = findViewById(R.id.btnZaprimljeno);
        btnIzrada = findViewById(R.id.btnIzrada);
        btnPriprema = findViewById(R.id.btnPriprema);
        btnStize = findViewById(R.id.btnStize);
        btnDostavljeno = findViewById(R.id.btnDostavljeno);

        narudzbaId = getIntent().getStringExtra("narudzbaId");

        if (narudzbaId == null || narudzbaId.isEmpty()) {
            Toast.makeText(this, "Nedostaje ID narudžbe", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        txtNarudzbaId.setText("Upravljanje: " + narudzbaId);

        btnZaprimljeno.setOnClickListener(v ->
                updateStatusNarudzbe(narudzbaId, "Narudžba zaprimljena", 1)
        );

        btnIzrada.setOnClickListener(v ->
                updateStatusNarudzbe(narudzbaId, "Krenulo u izradu", 2)
        );

        btnPriprema.setOnClickListener(v ->
                updateStatusNarudzbe(narudzbaId, "Priprema se", 3)
        );

        btnStize.setOnClickListener(v ->
                updateStatusNarudzbe(narudzbaId, "Uskoro stiže na vaš stol", 4)
        );

        btnDostavljeno.setOnClickListener(v ->
                updateStatusNarudzbe(narudzbaId, "Dostavljeno", 4)
        );
    }

    private void updateStatusNarudzbe(String narudzbaId, String status, int korak) {
        DatabaseReference ref = FirebaseDatabase.getInstance()
                .getReference("narudzbe")
                .child(narudzbaId);

        Map<String, Object> updateMap = new HashMap<>();
        updateMap.put("status", status);
        updateMap.put("korak", korak);
        updateMap.put("ukupnoKoraka", 4);

        ref.updateChildren(updateMap).addOnCompleteListener(task -> {
            if (task.isSuccessful()) {

                Toast.makeText(
                        AzuriranjeNarudzbeActivity.this,
                        "Status ažuriran: " + status,
                        Toast.LENGTH_SHORT
                ).show();

                finish();
                overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);

            } else {
                Toast.makeText(
                        AzuriranjeNarudzbeActivity.this,
                        "Greška pri ažuriranju statusa",
                        Toast.LENGTH_SHORT
                ).show();
            }
        });

    }
}
