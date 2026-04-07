package com.example.lav_digitalizacija.view.activity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.view.adapter.NarudzbaAdapter;
import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.MutableData;
import com.google.firebase.database.Transaction;
import com.google.firebase.database.ValueEventListener;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;


public class PregledNarudzbiActivity extends AppCompatActivity {

    private RecyclerView recyclerViewNarudzbe;
    private NarudzbaAdapter narudzbaAdapter;
    private ArrayList<String> narudzbeList;
    private int totalSelected = 0;
    private Button btnPosaljiNarudzbu;

    private TextView textViewUkupnoArtikala;
    private TextView textViewUkupnaCijena;

    private final Map<String, Integer> mapaCijena = new HashMap<>();
    private double ukupnaCijena = 0.0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pregled_narudzbi);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        recyclerViewNarudzbe = findViewById(R.id.recyclerViewNarudzbe);
        btnPosaljiNarudzbu = findViewById(R.id.btnPosaljiNarudzbu);
        textViewUkupnoArtikala = findViewById(R.id.textViewUkupnoArtikala);
        textViewUkupnaCijena = findViewById(R.id.textViewUkupnaCijena);
        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        Gson gson = new Gson();
        String json = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();
        narudzbeList = json == null ? new ArrayList<>() : gson.fromJson(json, type);

        totalSelected = calculateTotalQuantity(narudzbeList);
        osvjeziSummary();
        ucitajCijeneArtikala();
        narudzbaAdapter = new NarudzbaAdapter(narudzbeList);
        recyclerViewNarudzbe.setLayoutManager(new LinearLayoutManager(this));
        recyclerViewNarudzbe.setAdapter(narudzbaAdapter);

        ItemTouchHelper itemTouchHelper = new ItemTouchHelper(
                new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {
                    @Override
                    public boolean onMove(@NonNull RecyclerView recyclerView,
                                          @NonNull RecyclerView.ViewHolder viewHolder,
                                          @NonNull RecyclerView.ViewHolder target) {
                        return false;
                    }

                    @Override
                    public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder, int direction) {
                        int position = viewHolder.getAdapterPosition();
                        String obrisanaStavka = narudzbeList.get(position);

                        narudzbeList.remove(position);
                        narudzbaAdapter.notifyItemRemoved(position);

                        int obrisanaKolicina = extractQuantityFromOrder(obrisanaStavka);
                        totalSelected -= obrisanaKolicina;
                        updateResult();
                        izracunajUkupnuCijenu();

                        Snackbar snackbar = Snackbar.make(
                                        recyclerViewNarudzbe,
                                        R.string.order_item_deleted,
                                        Snackbar.LENGTH_LONG
                                )
                                .setDuration(10000)
                                .setAction(R.string.restore_product, v -> {
                                    narudzbeList.add(position, obrisanaStavka);
                                    narudzbaAdapter.notifyItemInserted(position);
                                    totalSelected += obrisanaKolicina;
                                    updateResult();
                                    izracunajUkupnuCijenu();
                                });

                        snackbar.addCallback(new Snackbar.Callback() {
                            @Override
                            public void onDismissed(Snackbar transientBottomBar, int event) {
                                if (event != DISMISS_EVENT_ACTION) {
                                    SharedPreferences.Editor editor = preferences.edit();
                                    editor.putString("narudzbe", gson.toJson(narudzbeList));
                                    editor.apply();
                                }
                            }
                        });

                        snackbar.show();
                    }
                }
        );
        itemTouchHelper.attachToRecyclerView(recyclerViewNarudzbe);

        btnPosaljiNarudzbu.setOnClickListener(v -> {
            if (!narudzbeList.isEmpty()) {
                btnPosaljiNarudzbu.setEnabled(false);
                posaljiNarudzbuFirebase();
            } else {
                Toast.makeText(this, R.string.add_item_first, Toast.LENGTH_SHORT).show();
            }
        });
    }


    private void posaljiNarudzbuFirebase() {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        String userId = currentUser != null ? currentUser.getUid() : null;

        if (userId == null) {
            Toast.makeText(
                    PregledNarudzbiActivity.this,
                    "Korisnik nije prijavljen. Pokušajte ponovno.",
                    Toast.LENGTH_SHORT
            ).show();
            btnPosaljiNarudzbu.setEnabled(true);
            return;
        }

        DatabaseReference databaseRef = FirebaseDatabase.getInstance().getReference();
        DatabaseReference narudzbeRef = databaseRef.child("narudzbe");
        DatabaseReference counterRef = databaseRef.child("SVEUKUPNO_IZDANO_NARUDZBI");

        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        counterRef.runTransaction(new Transaction.Handler() {
            @NonNull
            @Override
            public Transaction.Result doTransaction(@NonNull MutableData currentData) {
                Integer currentCounter = currentData.getValue(Integer.class);
                if (currentCounter == null) {
                    currentCounter = 0;
                }
                currentData.setValue(currentCounter + 1);
                return Transaction.success(currentData);
            }

            @Override
            public void onComplete(@Nullable DatabaseError error,
                                   boolean committed,
                                   @Nullable DataSnapshot currentData) {
                if (committed && currentData != null && currentData.getValue(Integer.class) != null) {
                    int newCounter = currentData.getValue(Integer.class);

                    String konobar = getIntent().getStringExtra("selectedUser");
                    int tableNumber = getIntent().getIntExtra("tableNumber", -1);

                    if (tableNumber == -1) {
                        Toast.makeText(
                                PregledNarudzbiActivity.this,
                                R.string.table_number_missing_error,
                                Toast.LENGTH_SHORT
                        ).show();
                        btnPosaljiNarudzbu.setEnabled(true);
                        return;
                    }

                    String noviKljuc = String.format(Locale.getDefault(), "Narudzba_%03d", newCounter);

                    Map<String, Object> narudzba = new HashMap<>();
                    narudzba.put("stavke", narudzbeList);
                    narudzba.put("vrijeme",
                            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                    narudzba.put("createdAt", System.currentTimeMillis());
                    narudzba.put("lastUpdated", System.currentTimeMillis());
                    narudzba.put("konobar", konobar);
                    narudzba.put("brojStola", tableNumber);
                    narudzba.put("restaurant", restaurant);
                    narudzba.put("qrToken", qrToken);
                    narudzba.put("userId", userId);
                    narudzba.put("status", "Narudžba zaprimljena");
                    narudzba.put("korak", 1);
                    narudzba.put("ukupnoKoraka", 4);
                    narudzba.put("napomenaZaGosta", "Kuhinja je zaprimila vašu narudžbu");

                    narudzbeRef.child(noviKljuc).setValue(narudzba).addOnCompleteListener(spremanjeTask -> {
                        if (spremanjeTask.isSuccessful()) {

                            SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);

                            totalSelected = 0;
                            updateResult();

                            ArrayList<String> poslaneStavke = new ArrayList<>(narudzbeList);

                            preferences.edit().remove("narudzbe").apply();
                            narudzbeList.clear();
                            narudzbaAdapter.notifyDataSetChanged();

                            Intent intent = new Intent(PregledNarudzbiActivity.this, PotvrdaNarudzbeActivity.class);
                            intent.putStringArrayListExtra("stavkeNarudzbe", poslaneStavke);
                            intent.putExtra("narudzbaId", noviKljuc);
                            intent.putExtra("tableNumber", tableNumber);
                            intent.putExtra("restaurant", restaurant);
                            intent.putExtra("qrToken", qrToken);
                            startActivity(intent);

                            finish();
                        } else {
                            btnPosaljiNarudzbu.setEnabled(true);
                            Toast.makeText(
                                    PregledNarudzbiActivity.this,
                                    R.string.order_send_error,
                                    Toast.LENGTH_SHORT
                            ).show();
                        }
                    });
                } else {
                    btnPosaljiNarudzbu.setEnabled(true);
                    Toast.makeText(
                            PregledNarudzbiActivity.this,
                            R.string.counter_update_error,
                            Toast.LENGTH_SHORT
                    ).show();
                }
            }
        });
    }


    private int extractQuantityFromOrder(String order) {
        try {
            String quantityPart = order.substring(order.lastIndexOf("(X") + 2, order.lastIndexOf(")"));
            return Integer.parseInt(quantityPart.trim());
        } catch (Exception e) {
            Log.e(
                    "PregledNarudzbiActivity",
                    getString(R.string.order_quantity_extract_error, order),
                    e
            );
            return 1;
        }
    }

    private int calculateTotalQuantity(ArrayList<String> narudzbeList) {
        int total = 0;
        for (String narudzba : narudzbeList) {
            total += extractQuantityFromOrder(narudzba);
        }
        return total;
    }

    private void updateResult() {
        Intent resultIntent = new Intent();
        resultIntent.putExtra("totalSelected", totalSelected);
        setResult(RESULT_OK, resultIntent);
    }

    private String extractItemNameFromOrder(String order) {
        try {
            int quantityIndex = order.lastIndexOf("(X");
            if (quantityIndex != -1) {
                return order.substring(0, quantityIndex).trim();
            }
            return order.trim();
        } catch (Exception e) {
            Log.e("PregledNarudzbiActivity", "Greška pri čitanju naziva artikla: " + order, e);
            return order.trim();
        }
    }

    private String formatEuro(double amount) {
        return String.format(Locale.getDefault(), "%.2f €", amount).replace(".", ",");
    }

    private void ucitajCijeneArtikala() {
        DatabaseReference rootRef = FirebaseDatabase.getInstance().getReference();

        rootRef.child("hrana").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                for (DataSnapshot itemSnapshot : snapshot.getChildren()) {
                    String name = itemSnapshot.child("name").getValue(String.class);
                    Integer cijenaCent = itemSnapshot.child("cijenaCent").getValue(Integer.class);

                    if (name != null && cijenaCent != null) {
                        mapaCijena.put(name.trim(), cijenaCent);
                    }
                }

                ucitajCijenePica();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                ucitajCijenePica();
            }
        });
    }

    private void ucitajCijenePica() {
        DatabaseReference rootRef = FirebaseDatabase.getInstance().getReference();

        rootRef.child("pica").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                for (DataSnapshot itemSnapshot : snapshot.getChildren()) {
                    String name = itemSnapshot.child("name").getValue(String.class);
                    Integer cijenaCent = itemSnapshot.child("cijenaCent").getValue(Integer.class);

                    if (name != null && cijenaCent != null) {
                        mapaCijena.put(name.trim(), cijenaCent);
                    }
                }

                izracunajUkupnuCijenu();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                izracunajUkupnuCijenu();
            }
        });
    }

    private void izracunajUkupnuCijenu() {
        int ukupnoCent = 0;

        for (String stavka : narudzbeList) {
            String naziv = extractItemNameFromOrder(stavka);
            int kolicina = extractQuantityFromOrder(stavka);

            Integer cijenaCent = mapaCijena.get(naziv);
            if (cijenaCent != null) {
                ukupnoCent += cijenaCent * kolicina;
            }
        }

        ukupnaCijena = ukupnoCent / 100.0;
        osvjeziSummary();
    }

    private void osvjeziSummary() {
        textViewUkupnoArtikala.setText("Odabrano artikala: " + totalSelected);
        textViewUkupnaCijena.setText("Ukupno: " + formatEuro(ukupnaCijena));
    }
}