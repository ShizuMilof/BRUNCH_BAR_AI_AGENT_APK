package com.example.lav_digitalizacija;

import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import java.util.ArrayList;
import java.util.List;

public class PregledMojihNarudzbiActivity extends AppCompatActivity {

    private RecyclerView recyclerViewNarudzbe;
    private TextView textViewEmptyMessage;
    private NarudzbaAdapterMojeNaru adapter;
    private List<String> narudzbeList;
    private String selectedUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        // Dobivanje korisničkog imena iz Intenta
        selectedUser = getIntent().getStringExtra("selectedUser");

        // Postavljanje fullscreen moda
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        // Inicijalizacija view-ova
        recyclerViewNarudzbe = findViewById(R.id.recyclerViewNarudzbe);

        // Postavi RecyclerView i adapter
        recyclerViewNarudzbe.setLayoutManager(new LinearLayoutManager(this));
        narudzbeList = new ArrayList<>();
        adapter = new NarudzbaAdapterMojeNaru(narudzbeList, this);
        recyclerViewNarudzbe.setAdapter(adapter);

        // Učitaj narudžbe prilikom pokretanja
        loadNarudzbe();
    }

    private void loadNarudzbe() {
        DatabaseReference databaseRef = FirebaseDatabase.getInstance().getReference("narudzbe");
        databaseRef.orderByChild("konobar").equalTo(selectedUser).addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
                narudzbeList.clear();
                for (DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    String narudzbaKey = snapshot.getKey();
                    if (narudzbaKey != null) {
                        List<String> stavkeList = new ArrayList<>();
                        for (DataSnapshot stavkaSnapshot : snapshot.child("stavke").getChildren()) {
                            String stavka = stavkaSnapshot.getValue(String.class);
                            if (stavka != null) {
                                stavkeList.add(stavka);
                            }
                        }
                        String prikazNarudzbe = narudzbaKey + "\n\n" +
                                String.join("\n", stavkeList) +
                                "\n\nBroj stola: " + snapshot.child("brojStola").getValue(Integer.class) +
                                "\nVrijeme: " + snapshot.child("vrijeme").getValue(String.class);

                        narudzbeList.add(prikazNarudzbe);
                    }
                }

                adapter.notifyDataSetChanged();

                if (narudzbeList.isEmpty()) {
                    textViewEmptyMessage.setVisibility(View.VISIBLE);
                    recyclerViewNarudzbe.setVisibility(View.GONE);
                } else {
                    textViewEmptyMessage.setVisibility(View.GONE);
                    recyclerViewNarudzbe.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError databaseError) {
                Toast.makeText(PregledMojihNarudzbiActivity.this, "Greška pri dohvaćanju narudžbi!", Toast.LENGTH_SHORT).show();
            }
        });
    }

    public void reloadNarudzbe() {
        new Handler().postDelayed(this::loadNarudzbe, 1000);
    }
}
