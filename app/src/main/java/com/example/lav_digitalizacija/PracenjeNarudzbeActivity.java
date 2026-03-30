package com.example.lav_digitalizacija;

import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;

public class PracenjeNarudzbeActivity extends AppCompatActivity {

    private TextView txtNarudzbaId;
    private TextView txtStatus;
    private TextView txtKorak;
    private TextView txtStavke;
    private ProgressBar progressBarNarudzba;
    private Button btnPromijeniStatus;

    private DatabaseReference narudzbaRef;
    private ValueEventListener narudzbaListener;

    private String narudzbaId;

    private String trenutniStatus = "";
    private int trenutniKorak = 0;
    private int ukupnoKorakaTrenutno = 4;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pracenje_narudzbe);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        txtNarudzbaId = findViewById(R.id.txtNarudzbaId);
        txtStatus = findViewById(R.id.txtStatus);
        txtKorak = findViewById(R.id.txtKorak);
        txtStavke = findViewById(R.id.txtStavke);
        progressBarNarudzba = findViewById(R.id.progressBarNarudzba);
        btnPromijeniStatus = findViewById(R.id.btnPromijeniStatus);

        narudzbaId = getIntent().getStringExtra("narudzbaId");

        if (narudzbaId == null || narudzbaId.isEmpty()) {
            Toast.makeText(this, "Nedostaje ID narudžbe", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        txtNarudzbaId.setText(narudzbaId);

        narudzbaRef = FirebaseDatabase.getInstance()
                .getReference("narudzbe")
                .child(narudzbaId);

        btnPromijeniStatus.setOnClickListener(v -> pomakniNaSljedeciKorak());

        ucitajNarudzbu();
    }

    private void pomakniNaSljedeciKorak() {
        String noviStatus;
        int noviKorak;

        switch (trenutniStatus) {
            case "Narudžba zaprimljena":
                noviStatus = "Krenulo u izradu";
                noviKorak = 2;
                break;

            case "Krenulo u izradu":
                noviStatus = "Priprema se";
                noviKorak = 3;
                break;

            case "Priprema se":
                noviStatus = "Uskoro stiže na vaš stol";
                noviKorak = 4;
                break;

            case "Uskoro stiže na vaš stol":
                noviStatus = "Dostavljeno";
                noviKorak = 4;
                break;

            case "Dostavljeno":
                Toast.makeText(this, "Narudžba je već dostavljena", Toast.LENGTH_SHORT).show();
                return;

            default:
                Toast.makeText(this, "Status nije moguće ažurirati", Toast.LENGTH_SHORT).show();
                return;
        }

        btnPromijeniStatus.setEnabled(false);

        narudzbaRef.child("status").setValue(noviStatus);
        narudzbaRef.child("korak").setValue(noviKorak);
        narudzbaRef.child("ukupnoKoraka").setValue(ukupnoKorakaTrenutno)
                .addOnCompleteListener(task -> {
                    btnPromijeniStatus.setEnabled(true);

                    if (task.isSuccessful()) {
                        Toast.makeText(this, "Status ažuriran", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "Greška pri ažuriranju", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void ucitajNarudzbu() {
        narudzbaListener = new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    Toast.makeText(PracenjeNarudzbeActivity.this,
                            "Narudžba ne postoji",
                            Toast.LENGTH_SHORT).show();
                    finish();
                    return;
                }

                String status = snapshot.child("status").getValue(String.class);
                Integer korak = snapshot.child("korak").getValue(Integer.class);
                Integer ukupnoKoraka = snapshot.child("ukupnoKoraka").getValue(Integer.class);

                trenutniStatus = status != null ? status : "";
                trenutniKorak = korak != null ? korak : 0;
                ukupnoKorakaTrenutno = ukupnoKoraka != null ? ukupnoKoraka : 4;

                if (status != null) {
                    txtStatus.setText(status);

                    switch (status) {
                        case "Narudžba zaprimljena":
                            txtStatus.setTextColor(getResources().getColor(android.R.color.holo_red_light));
                            break;

                        case "Krenulo u izradu":
                            txtStatus.setTextColor(getResources().getColor(android.R.color.holo_orange_light));
                            break;

                        case "Priprema se":
                            txtStatus.setTextColor(getResources().getColor(android.R.color.holo_orange_dark));
                            break;

                        case "Uskoro stiže na vaš stol":
                            txtStatus.setTextColor(getResources().getColor(android.R.color.holo_blue_light));
                            break;

                        case "Dostavljeno":
                            txtStatus.setTextColor(getResources().getColor(android.R.color.holo_green_light));
                            break;

                        default:
                            txtStatus.setTextColor(getResources().getColor(android.R.color.white));
                            break;
                    }

                } else {
                    txtStatus.setText("Status nije dostupan");
                }

                if (korak != null && ukupnoKoraka != null && ukupnoKoraka > 0) {
                    txtKorak.setText("Korak " + korak + "/" + ukupnoKoraka);
                    progressBarNarudzba.setMax(ukupnoKoraka);
                    progressBarNarudzba.setProgress(korak);
                } else {
                    txtKorak.setText("Koraci nisu dostupni");
                    progressBarNarudzba.setMax(1);
                    progressBarNarudzba.setProgress(0);
                }

                ArrayList<String> stavke = new ArrayList<>();
                for (DataSnapshot stavkaSnapshot : snapshot.child("stavke").getChildren()) {
                    String stavka = stavkaSnapshot.getValue(String.class);
                    if (stavka != null) {
                        stavke.add(stavka);
                    }
                }

                if (!stavke.isEmpty()) {
                    StringBuilder builder = new StringBuilder();
                    for (String stavka : stavke) {
                        builder.append("• ").append(stavka).append("\n");
                    }
                    txtStavke.setText(builder.toString().trim());
                } else {
                    txtStavke.setText("Nema stavki u narudžbi");
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                Toast.makeText(PracenjeNarudzbeActivity.this,
                        "Greška pri učitavanju narudžbe",
                        Toast.LENGTH_SHORT).show();
            }
        };

        narudzbaRef.addValueEventListener(narudzbaListener);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (narudzbaRef != null && narudzbaListener != null) {
            narudzbaRef.removeEventListener(narudzbaListener);
        }
    }
}