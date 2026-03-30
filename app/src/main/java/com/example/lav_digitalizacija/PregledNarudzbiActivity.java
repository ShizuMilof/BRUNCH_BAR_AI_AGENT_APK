package com.example.lav_digitalizacija;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.MutableData;
import com.google.firebase.database.Transaction;
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

        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        Gson gson = new Gson();
        String json = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();
        narudzbeList = json == null ? new ArrayList<>() : gson.fromJson(json, type);

        totalSelected = calculateTotalQuantity(narudzbeList);

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
                    narudzba.put("konobar", konobar);
                    narudzba.put("brojStola", tableNumber);
                    narudzba.put("restaurant", restaurant);
                    narudzba.put("qrToken", qrToken);
                    narudzba.put("status", "Narudžba zaprimljena");
                    narudzba.put("korak", 1);
                    narudzba.put("ukupnoKoraka", 4);
                    narudzba.put("napomenaZaGosta", "Kuhinja je zaprimila vašu narudžbu");
                    narudzba.put("lastUpdated", System.currentTimeMillis());

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
}