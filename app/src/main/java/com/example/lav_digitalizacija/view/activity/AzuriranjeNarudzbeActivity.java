package com.example.lav_digitalizacija.view.activity;

import android.content.res.ColorStateList;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.lav_digitalizacija.R;
import com.google.android.material.button.MaterialButton;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.HashMap;
import java.util.Map;

public class AzuriranjeNarudzbeActivity extends AppCompatActivity {

    private TextView txtNarudzbaId;

    private MaterialButton btnZaprimljeno;
    private MaterialButton btnIzrada;
    private MaterialButton btnPriprema;
    private MaterialButton btnStize;
    private MaterialButton btnDostavljeno;

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

        postaviKlikove();
        ucitajTrenutniStatus();
    }

    private void ucitajTrenutniStatus() {
        DatabaseReference ref = FirebaseDatabase.getInstance()
                .getReference("narudzbe")
                .child(narudzbaId);

        ref.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                String status = snapshot.child("status").getValue(String.class);

                if (status != null) {
                    oznaciAktivniStatus(status);
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                Toast.makeText(
                        AzuriranjeNarudzbeActivity.this,
                        "Greška pri učitavanju statusa",
                        Toast.LENGTH_SHORT
                ).show();
            }
        });
    }

    private void postaviKlikove() {
        btnZaprimljeno.setOnClickListener(v ->
                updateStatusNarudzbe("Narudžba zaprimljena", 1)
        );

        btnIzrada.setOnClickListener(v ->
                updateStatusNarudzbe("Krenulo u izradu", 2)
        );

        btnPriprema.setOnClickListener(v ->
                updateStatusNarudzbe("Priprema se", 3)
        );

        btnStize.setOnClickListener(v ->
                updateStatusNarudzbe("Uskoro stiže na vaš stol", 4)
        );

        btnDostavljeno.setOnClickListener(v ->
                updateStatusNarudzbe("Dostavljeno", 4)
        );
    }

    private void updateStatusNarudzbe(String status, int korak) {
        oznaciAktivniStatus(status);
        postaviGumbeEnabled(false);

        DatabaseReference ref = FirebaseDatabase.getInstance()
                .getReference("narudzbe")
                .child(narudzbaId);

        Map<String, Object> updateMap = new HashMap<>();
        updateMap.put("status", status);
        updateMap.put("korak", korak);
        updateMap.put("ukupnoKoraka", 4);

        ref.updateChildren(updateMap).addOnCompleteListener(task -> {
            postaviGumbeEnabled(true);

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

    private void oznaciAktivniStatus(String status) {
        resetirajGumbeStatusa();

        switch (status) {
            case "Narudžba zaprimljena":
                oznaciGumb(btnZaprimljeno);
                break;

            case "Krenulo u izradu":
                oznaciGumb(btnIzrada);
                break;

            case "Priprema se":
                oznaciGumb(btnPriprema);
                break;

            case "Uskoro stiže na vaš stol":
                oznaciGumb(btnStize);
                break;

            case "Dostavljeno":
                oznaciGumb(btnDostavljeno);
                break;
        }
    }

    private void resetirajGumbeStatusa() {
        resetirajGumb(btnZaprimljeno);
        resetirajGumb(btnIzrada);
        resetirajGumb(btnPriprema);
        resetirajGumb(btnStize);
        resetirajGumb(btnDostavljeno);
    }

    private void resetirajGumb(MaterialButton button) {
        button.setBackgroundTintList(ColorStateList.valueOf(getColor(android.R.color.white)));
        button.setTextColor(getColor(R.color.primary));
        button.setStrokeColor(ColorStateList.valueOf(getColor(R.color.primary)));
        button.setStrokeWidth(3);
    }

    private void oznaciGumb(MaterialButton button) {
        button.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.primary)));
        button.setTextColor(getColor(android.R.color.white));
        button.setStrokeColor(ColorStateList.valueOf(getColor(R.color.primary)));
        button.setStrokeWidth(3);
    }

    private void postaviGumbeEnabled(boolean enabled) {
        btnZaprimljeno.setEnabled(enabled);
        btnIzrada.setEnabled(enabled);
        btnPriprema.setEnabled(enabled);
        btnStize.setEnabled(enabled);
        btnDostavljeno.setEnabled(enabled);
    }
}