package com.example.lav_digitalizacija.view.activity;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.AktivnaNarudzbaModel;
import com.example.lav_digitalizacija.view.adapter.KuhinjaAdapter;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;


public class KuhinjaActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private KuhinjaAdapter adapter;
    private ArrayList<AktivnaNarudzbaModel> lista;

    private ProgressBar progressBar;
    private TextView txtPrazno;

    private DatabaseReference narudzbeRef;
    private ValueEventListener listener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_kuhinja);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        recyclerView = findViewById(R.id.recyclerViewKuhinja);
        progressBar = findViewById(R.id.progressBarKuhinja);
        txtPrazno = findViewById(R.id.txtPrazno);

        lista = new ArrayList<>();

        adapter = new KuhinjaAdapter(lista, narudzba -> {
            Intent intent = new Intent(KuhinjaActivity.this, AzuriranjeNarudzbeActivity.class);
            intent.putExtra("narudzbaId", narudzba.getNarudzbaId());
            startActivity(intent);
        });

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        narudzbeRef = FirebaseDatabase.getInstance().getReference("narudzbe");

        ucitajNarudzbe();
    }

    private void ucitajNarudzbe() {
        progressBar.setVisibility(ProgressBar.VISIBLE);

        listener = new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                progressBar.setVisibility(ProgressBar.GONE);
                lista.clear();

                for (DataSnapshot narudzbaSnapshot : snapshot.getChildren()) {

                    String narudzbaId = narudzbaSnapshot.getKey();
                    String status = narudzbaSnapshot.child("status").getValue(String.class);
                    Integer brojStola = narudzbaSnapshot.child("brojStola").getValue(Integer.class);
                    String vrijeme = narudzbaSnapshot.child("vrijeme").getValue(String.class);

                    // filtriraj samo aktivne
                    boolean aktivna = status != null
                            && !status.equals("Dostavljeno")
                            && !status.equals("Otkazano");

                    if (!aktivna) continue;

                    ArrayList<String> stavke = new ArrayList<>();
                    for (DataSnapshot stavkaSnapshot : narudzbaSnapshot.child("stavke").getChildren()) {
                        String stavka = stavkaSnapshot.getValue(String.class);
                        if (stavka != null) stavke.add(stavka);
                    }

                    AktivnaNarudzbaModel model = new AktivnaNarudzbaModel(
                            narudzbaId,
                            brojStola != null ? brojStola : -1,
                            status,
                            vrijeme,
                            stavke
                    );

                    lista.add(model);
                }

                adapter.notifyDataSetChanged();

                txtPrazno.setVisibility(lista.isEmpty() ? TextView.VISIBLE : TextView.GONE);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                progressBar.setVisibility(ProgressBar.GONE);
                Toast.makeText(KuhinjaActivity.this,
                        "Greška pri učitavanju",
                        Toast.LENGTH_SHORT).show();
            }
        };

        narudzbeRef.addValueEventListener(listener);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (narudzbeRef != null && listener != null) {
            narudzbeRef.removeEventListener(listener);
        }
    }
}