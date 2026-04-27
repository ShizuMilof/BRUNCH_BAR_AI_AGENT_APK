package com.example.lav_digitalizacija.view.activity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.DefaultItemAnimator;
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

    private SharedPreferences preferences;
    private Gson gson;

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

        preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        gson = new Gson();

        String json = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();
        narudzbeList = json == null ? new ArrayList<>() : gson.fromJson(json, type);

        totalSelected = calculateTotalQuantity(narudzbeList);
        osvjeziSummary();

        setupRecycler();
        setupRecyclerAnimations();
        setupSwipeToDelete();
        ucitajCijeneArtikala();

        btnPosaljiNarudzbu.setOnClickListener(v -> {
            if (!narudzbeList.isEmpty()) {
                btnPosaljiNarudzbu.setEnabled(false);
                posaljiNarudzbuFirebase();
            } else {
                Toast.makeText(this, R.string.add_item_first, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupRecycler() {
        narudzbaAdapter = new NarudzbaAdapter(narudzbeList);

        narudzbaAdapter.setOnQuantityChangeListener(new NarudzbaAdapter.OnQuantityChangeListener() {
            @Override
            public void onIncrease(int position) {
                promijeniKolicinu(position, 1);
            }

            @Override
            public void onDecrease(int position) {
                promijeniKolicinu(position, -1);
            }
        });
        narudzbaAdapter.setOnItemClickListener(position -> otvoriModifikacijeZaStavku(position));
        recyclerViewNarudzbe.setLayoutManager(new LinearLayoutManager(this));
        recyclerViewNarudzbe.setAdapter(narudzbaAdapter);
    }


    private void otvoriModifikacijeZaStavku(int position) {
        if (position < 0 || position >= narudzbeList.size()) return;

        String stavka = narudzbeList.get(position);
        String nazivArtikla = extractItemNameFromOrder(stavka);
        int kolicina = extractQuantityFromOrder(stavka);

        DatabaseReference rootRef = FirebaseDatabase.getInstance().getReference();

        rootRef.child("hrana").addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot hranaSnapshot) {
                for (DataSnapshot itemSnapshot : hranaSnapshot.getChildren()) {
                    String name = itemSnapshot.child("name").getValue(String.class);

                    if (name != null && name.trim().equals(nazivArtikla)) {
                        pokreniModifikacijeActivity(itemSnapshot, position, stavka, kolicina);
                        return;
                    }
                }

                rootRef.child("pica").addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(@NonNull DataSnapshot picaSnapshot) {
                        for (DataSnapshot itemSnapshot : picaSnapshot.getChildren()) {
                            String name = itemSnapshot.child("name").getValue(String.class);

                            if (name != null && name.trim().equals(nazivArtikla)) {
                                pokreniModifikacijeActivity(itemSnapshot, position, stavka, kolicina);
                                return;
                            }
                        }

                        Toast.makeText(
                                PregledNarudzbiActivity.this,
                                "Ne mogu pronaći artikl za uređivanje.",
                                Toast.LENGTH_SHORT
                        ).show();
                    }

                    @Override
                    public void onCancelled(@NonNull DatabaseError error) {
                        Toast.makeText(PregledNarudzbiActivity.this, "Greška pri učitavanju pića.", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                Toast.makeText(PregledNarudzbiActivity.this, "Greška pri učitavanju hrane.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void pokreniModifikacijeActivity(DataSnapshot itemSnapshot, int position, String stavka, int kolicina) {
        String name = itemSnapshot.child("name").getValue(String.class);

        if (name == null || name.trim().isEmpty()) {
            name = itemSnapshot.getKey();
        }

        String imageUrl = itemSnapshot.child("imageUrl").getValue(String.class);

        String finalName = name;
        DatabaseReference rootRef = FirebaseDatabase.getInstance().getReference();

        rootRef.child("modifikacije")
                .child(finalName)
                .addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(@NonNull DataSnapshot modSnapshot) {
                        ArrayList<String> modifikacije = new ArrayList<>();

                        for (DataSnapshot child : modSnapshot.getChildren()) {
                            String mod = child.getValue(String.class);

                            if (mod == null || mod.trim().isEmpty()) {
                                mod = child.getKey();
                            }

                            if (mod != null && !mod.trim().isEmpty()) {
                                modifikacije.add(mod.trim());
                            }
                        }

                        Log.d("MODIFIKACIJE", "Artikl: " + finalName);
                        Log.d("MODIFIKACIJE", "Lista: " + modifikacije);

                        Intent intent = new Intent(PregledNarudzbiActivity.this, ModifikacijeActivity.class);
                        intent.putExtra("proizvod", finalName);
                        intent.putStringArrayListExtra("modifikacije", modifikacije);
                        intent.putExtra("imageUrl", imageUrl);
                        intent.putExtra("editMode", true);
                        intent.putExtra("editPosition", position);
                        intent.putExtra("existingOrder", stavka);
                        intent.putExtra("existingQuantity", kolicina);

                        startActivityForResult(intent, 2001);
                    }

                    @Override
                    public void onCancelled(@NonNull DatabaseError error) {
                        Toast.makeText(
                                PregledNarudzbiActivity.this,
                                "Greška pri učitavanju modifikacija.",
                                Toast.LENGTH_SHORT
                        ).show();
                    }
                });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == 2001 && resultCode == RESULT_OK) {
            String json = preferences.getString("narudzbe", null);
            Type type = new TypeToken<ArrayList<String>>() {
            }.getType();

            narudzbeList.clear();

            ArrayList<String> updatedList = json == null
                    ? new ArrayList<>()
                    : gson.fromJson(json, type);

            if (updatedList != null) {
                narudzbeList.addAll(updatedList);
            }

            totalSelected = calculateTotalQuantity(narudzbeList);
            narudzbaAdapter.notifyDataSetChanged();
            updateResult();
            izracunajUkupnuCijenu();
        }
    }

    private void setupRecyclerAnimations() {
        DefaultItemAnimator animator = new DefaultItemAnimator();
        animator.setAddDuration(220);
        animator.setRemoveDuration(220);
        animator.setMoveDuration(180);
        animator.setChangeDuration(180);
        recyclerViewNarudzbe.setItemAnimator(animator);
    }

    private void setupSwipeToDelete() {
        ItemTouchHelper itemTouchHelper = new ItemTouchHelper(
                new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {

                    private final Paint paint = new Paint();
                    private final Drawable deleteIcon = ContextCompat.getDrawable(
                            PregledNarudzbiActivity.this,
                            android.R.drawable.ic_menu_delete
                    );

                    @Override
                    public boolean onMove(@NonNull RecyclerView recyclerView,
                                          @NonNull RecyclerView.ViewHolder viewHolder,
                                          @NonNull RecyclerView.ViewHolder target) {
                        return false;
                    }

                    @Override
                    public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder, int direction) {
                        int position = viewHolder.getAdapterPosition();

                        if (position == RecyclerView.NO_POSITION || position >= narudzbeList.size()) {
                            narudzbaAdapter.notifyDataSetChanged();
                            return;
                        }

                        obrisiStavkuSaUndo(position);
                    }

                    @Override
                    public void onChildDraw(@NonNull Canvas c,
                                            @NonNull RecyclerView recyclerView,
                                            @NonNull RecyclerView.ViewHolder viewHolder,
                                            float dX,
                                            float dY,
                                            int actionState,
                                            boolean isCurrentlyActive) {

                        View itemView = viewHolder.itemView;

                        if (actionState == ItemTouchHelper.ACTION_STATE_SWIPE) {
                            float cornerRadius = 24f;
                            paint.setColor(Color.parseColor("#D32F2F"));

                            float alpha = 1.0f - Math.min(1.0f, Math.abs(dX) / itemView.getWidth());
                            itemView.setAlpha(alpha);

                            if (dX > 0) {
                                RectF background = new RectF(
                                        itemView.getLeft(),
                                        itemView.getTop(),
                                        itemView.getLeft() + dX,
                                        itemView.getBottom()
                                );
                                c.drawRoundRect(background, cornerRadius, cornerRadius, paint);

                                if (deleteIcon != null) {
                                    int iconMargin = (itemView.getHeight() - deleteIcon.getIntrinsicHeight()) / 2;
                                    int iconTop = itemView.getTop() + iconMargin;
                                    int iconBottom = iconTop + deleteIcon.getIntrinsicHeight();
                                    int iconLeft = itemView.getLeft() + 40;
                                    int iconRight = iconLeft + deleteIcon.getIntrinsicWidth();

                                    deleteIcon.setBounds(iconLeft, iconTop, iconRight, iconBottom);
                                    deleteIcon.draw(c);
                                }
                            } else if (dX < 0) {
                                RectF background = new RectF(
                                        itemView.getRight() + dX,
                                        itemView.getTop(),
                                        itemView.getRight(),
                                        itemView.getBottom()
                                );
                                c.drawRoundRect(background, cornerRadius, cornerRadius, paint);

                                if (deleteIcon != null) {
                                    int iconMargin = (itemView.getHeight() - deleteIcon.getIntrinsicHeight()) / 2;
                                    int iconTop = itemView.getTop() + iconMargin;
                                    int iconBottom = iconTop + deleteIcon.getIntrinsicHeight();
                                    int iconRight = itemView.getRight() - 40;
                                    int iconLeft = iconRight - deleteIcon.getIntrinsicWidth();

                                    deleteIcon.setBounds(iconLeft, iconTop, iconRight, iconBottom);
                                    deleteIcon.draw(c);
                                }
                            }
                        }

                        super.onChildDraw(c, recyclerView, viewHolder, dX, dY, actionState, isCurrentlyActive);
                    }

                    @Override
                    public void clearView(@NonNull RecyclerView recyclerView, @NonNull RecyclerView.ViewHolder viewHolder) {
                        super.clearView(recyclerView, viewHolder);
                        viewHolder.itemView.setAlpha(1f);
                    }
                }
        );

        itemTouchHelper.attachToRecyclerView(recyclerViewNarudzbe);
    }

    private void obrisiStavkuSaUndo(int position) {
        if (position < 0 || position >= narudzbeList.size()) return;

        String obrisanaStavka = narudzbeList.get(position);
        String nazivArtikla = extractItemNameFromOrder(obrisanaStavka);

        narudzbeList.remove(position);
        narudzbaAdapter.notifyItemRemoved(position);

        totalSelected = calculateTotalQuantity(narudzbeList);
        updateResult();
        izracunajUkupnuCijenu();

        Snackbar snackbar = Snackbar.make(
                        recyclerViewNarudzbe,
                        "Uklonjeno: " + nazivArtikla,
                        Snackbar.LENGTH_LONG
                )
                .setDuration(5000)
                .setAction("Vrati", v -> {
                    int safePosition = Math.min(position, narudzbeList.size());
                    narudzbeList.add(safePosition, obrisanaStavka);
                    narudzbaAdapter.notifyItemInserted(safePosition);

                    totalSelected = calculateTotalQuantity(narudzbeList);
                    updateResult();
                    izracunajUkupnuCijenu();
                    spremiNarudzbe();
                });

        snackbar.setBackgroundTint(Color.parseColor("#1E1E1E"));
        snackbar.setTextColor(Color.WHITE);
        snackbar.setActionTextColor(Color.parseColor("#FFCC00"));

        snackbar.addCallback(new Snackbar.Callback() {
            @Override
            public void onDismissed(Snackbar transientBottomBar, int event) {
                if (event != DISMISS_EVENT_ACTION) {
                    spremiNarudzbe();
                }
            }
        });

        snackbar.show();
    }

    private void promijeniKolicinu(int position, int delta) {
        if (position < 0 || position >= narudzbeList.size()) return;

        String staraStavka = narudzbeList.get(position);
        int staraKolicina = extractQuantityFromOrder(staraStavka);
        int novaKolicina = staraKolicina + delta;

        if (novaKolicina <= 0) {
            obrisiStavkuSaUndo(position);
            return;
        }

        String novaStavka = replaceQuantityInOrder(staraStavka, novaKolicina);
        narudzbeList.set(position, novaStavka);
        narudzbaAdapter.notifyItemChanged(position);

        totalSelected = calculateTotalQuantity(narudzbeList);
        spremiNarudzbe();
        updateResult();
        izracunajUkupnuCijenu();
    }

    private String replaceQuantityInOrder(String order, int newQuantity) {
        try {
            int start = order.lastIndexOf("(X");
            int end = order.lastIndexOf(")");

            if (start != -1 && end != -1 && start < end) {
                return order.substring(0, start) + "(X" + newQuantity + ")";
            } else {
                return order + " (X" + newQuantity + ")";
            }
        } catch (Exception e) {
            Log.e("PregledNarudzbiActivity", "Greška pri promjeni količine: " + order, e);
            return order;
        }
    }

    private void spremiNarudzbe() {
        preferences.edit()
                .putString("narudzbe", gson.toJson(narudzbeList))
                .putInt("total_selected", totalSelected)
                .apply();
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
                    narudzba.put("stavke", new ArrayList<>(narudzbeList));
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
                            totalSelected = 0;
                            updateResult();

                            ArrayList<String> poslaneStavke = new ArrayList<>(narudzbeList);

                            preferences.edit()
                                    .remove("narudzbe")
                                    .putInt("total_selected", 0)
                                    .apply();

                            narudzbeList.clear();
                            narudzbaAdapter.notifyDataSetChanged();
                            izracunajUkupnuCijenu();

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
            String base = quantityIndex != -1
                    ? order.substring(0, quantityIndex).trim()
                    : order.trim();

            int newLineIndex = base.indexOf("\n");
            if (newLineIndex != -1) {
                base = base.substring(0, newLineIndex).trim();
            }

            int noteIndex = base.indexOf("NAPOMENA:");
            if (noteIndex != -1) {
                base = base.substring(0, noteIndex).trim();
            }

            int modIndex = base.indexOf("MODIFIKACIJE:");
            if (modIndex != -1) {
                base = base.substring(0, modIndex).trim();
            }

            return base.trim();

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