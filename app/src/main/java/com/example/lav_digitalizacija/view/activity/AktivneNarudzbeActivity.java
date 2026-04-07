package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.AktivnaNarudzbaModel;
import com.example.lav_digitalizacija.view.adapter.AktivneNarudzbeAdapter;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;
import java.util.List;

public class AktivneNarudzbeActivity extends AppCompatActivity {

    private RecyclerView recyclerViewAktivneNarudzbe;
    private AktivneNarudzbeAdapter adapter;
    private List<AktivnaNarudzbaModel> aktivneNarudzbeList;
    private ProgressBar progressBar;
    private TextView txtPrazno;
    private ImageButton btnBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_aktivne_narudzbe);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        recyclerViewAktivneNarudzbe = findViewById(R.id.recyclerViewAktivneNarudzbe);
        progressBar = findViewById(R.id.progressBarAktivneNarudzbe);
        txtPrazno = findViewById(R.id.txtPrazno);
        btnBack = findViewById(R.id.btnBack);

        aktivneNarudzbeList = new ArrayList<>();
        adapter = new AktivneNarudzbeAdapter(aktivneNarudzbeList, narudzba -> {
            Intent intent = new Intent(AktivneNarudzbeActivity.this, PracenjeNarudzbeActivity.class);
            intent.putExtra("narudzbaId", narudzba.getNarudzbaId());

            intent.putExtra("tableNumber", getIntent().getIntExtra("tableNumber", -1));
            intent.putExtra("restaurant", getIntent().getStringExtra("restaurant"));
            intent.putExtra("qrToken", getIntent().getStringExtra("qrToken"));

            startActivity(intent);
        });

        recyclerViewAktivneNarudzbe.setLayoutManager(new LinearLayoutManager(this));
        recyclerViewAktivneNarudzbe.setAdapter(adapter);

        btnBack.setOnClickListener(v -> finish());

        ucitajAktivneNarudzbe();
    }

    private void ucitajAktivneNarudzbe() {
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String qrToken = getIntent().getStringExtra("qrToken");

        if (tableNumber == -1) {
            Toast.makeText(this, "Nedostaje broj stola", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        progressBar.setVisibility(ProgressBar.VISIBLE);
        txtPrazno.setVisibility(TextView.GONE);

        DatabaseReference narudzbeRef = FirebaseDatabase.getInstance().getReference("narudzbe");

        narudzbeRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                progressBar.setVisibility(ProgressBar.GONE);
                aktivneNarudzbeList.clear();

                for (DataSnapshot narudzbaSnapshot : snapshot.getChildren()) {
                    String narudzbaId = narudzbaSnapshot.getKey();

                    Integer brojStola = narudzbaSnapshot.child("brojStola").getValue(Integer.class);
                    String status = narudzbaSnapshot.child("status").getValue(String.class);
                    String firebaseQrToken = narudzbaSnapshot.child("qrToken").getValue(String.class);
                    String vrijeme = narudzbaSnapshot.child("vrijeme").getValue(String.class);

                    boolean istiStol = brojStola != null && brojStola == tableNumber;
                    boolean istiQr = qrToken == null || qrToken.equals(firebaseQrToken);
                    boolean aktivna = status != null
                            && !status.equals("Dostavljeno")
                            && !status.equals("Otkazano");

                    if (istiStol && istiQr && aktivna) {
                        List<String> stavke = new ArrayList<>();
                        for (DataSnapshot stavkaSnapshot : narudzbaSnapshot.child("stavke").getChildren()) {
                            String stavka = stavkaSnapshot.getValue(String.class);
                            if (stavka != null) {
                                stavke.add(stavka);
                            }
                        }

                        AktivnaNarudzbaModel model = new AktivnaNarudzbaModel(
                                narudzbaId,
                                brojStola,
                                status,
                                vrijeme,
                                stavke
                        );

                        aktivneNarudzbeList.add(model);
                    }
                }

                adapter.notifyDataSetChanged();

                if (aktivneNarudzbeList.isEmpty()) {
                    txtPrazno.setVisibility(TextView.VISIBLE);
                } else {
                    txtPrazno.setVisibility(TextView.GONE);
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                progressBar.setVisibility(ProgressBar.GONE);
                Toast.makeText(AktivneNarudzbeActivity.this,
                        "Greška pri učitavanju narudžbi",
                        Toast.LENGTH_SHORT).show();
            }
        });
    }
}