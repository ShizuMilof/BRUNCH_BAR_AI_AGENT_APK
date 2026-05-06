package com.example.lav_digitalizacija.view.activity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.MenuItem;
import com.example.lav_digitalizacija.view.adapter.MenuItemAdapter;
import com.google.android.material.tabs.TabLayout;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.text.Collator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;

public class OdabirJelaPicaActivity extends AppCompatActivity {

    private DatabaseReference mDatabase;
    private RecyclerView mRecyclerView;
    private List<MenuItem> mMenuItemList;
    private MenuItemAdapter mAdapter;

    private TextView mTextViewTotalSelected;
    private TextView textViewTableNumber;
    private TextView textViewMenuTitle;

    private TabLayout tabLayoutTop;
    private ImageButton btnMojeNarudzbe;
    private TabLayout tabLayoutBottom;
    private ProgressBar progressBar;

    private Button btnHrana;
    private Button btnPica;
    private Button btnZavrsiNarudzbu;
    private Button btnPonistiNarudzbu;

    private ImageButton btnAiChat;

    private long lastClickTime = 0;

    private String aktivniMeni = "hrana";
    private final HashMap<String, List<MenuItem>> artikliPoKategorijama = new HashMap<>();

    private final TabLayout.OnTabSelectedListener listener = new TabLayout.OnTabSelectedListener() {
        @Override
        public void onTabSelected(TabLayout.Tab tab) {
            if (tab == null || tab.getText() == null) return;
            String odabranaKategorija = tab.getText().toString();
            prikaziArtiklePoKategoriji(odabranaKategorija);
        }

        @Override
        public void onTabUnselected(TabLayout.Tab tab) {
        }

        @Override
        public void onTabReselected(TabLayout.Tab tab) {
            if (tab == null || tab.getText() == null) return;
            String odabranaKategorija = tab.getText().toString();
            prikaziArtiklePoKategoriji(odabranaKategorija);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_odabir_jela_pica);

        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        initViews();
        setupTableInfo();
        setupRecycler();
        setupButtons();
        setupTabs();
        ponistiNarudzbu();
        ucitajMeni();
    }

    @Override
    protected void onResume() {
        super.onResume();
        provjeriAktivneNarudzbeZaStol();
        osvjeziBrojOdabranihArtikala();
    }

    private void initViews() {
        progressBar = findViewById(R.id.progressBar);
        mRecyclerView = findViewById(R.id.recyclerView);
        mTextViewTotalSelected = findViewById(R.id.textViewTotalSelected);
        textViewTableNumber = findViewById(R.id.textViewTableNumber);
        textViewMenuTitle = findViewById(R.id.textViewMenuTitle);

        tabLayoutTop = findViewById(R.id.tabLayoutTop);
        tabLayoutBottom = findViewById(R.id.tabLayoutBottom);

        btnHrana = findViewById(R.id.btnHrana);
        btnPica = findViewById(R.id.btnPica);
        btnZavrsiNarudzbu = findViewById(R.id.btnZavrsiNarudzbu);
        btnPonistiNarudzbu = findViewById(R.id.btnPonistiNarudzbu);
        btnMojeNarudzbe = findViewById(R.id.btnMojeNarudzbe);
        btnAiChat = findViewById(R.id.btnAiChat);
    }

    private void setupTableInfo() {
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        if (tableNumber != -1 && textViewTableNumber != null) {
            textViewTableNumber.setText(getString(R.string.table_number, tableNumber));
        }

        osvjeziNaslovMenija();
    }

    private void animirajGumbMojeNarudzbe() {
        if (btnMojeNarudzbe == null || btnMojeNarudzbe.getVisibility() != View.VISIBLE) return;

        btnMojeNarudzbe.setScaleX(1f);
        btnMojeNarudzbe.setScaleY(1f);
        btnMojeNarudzbe.setAlpha(1f);

        btnMojeNarudzbe.animate()
                .scaleX(1.35f)
                .scaleY(1.35f)
                .alpha(0.6f)
                .setDuration(250)
                .withEndAction(() -> btnMojeNarudzbe.animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .alpha(1f)
                        .setDuration(250)
                        .withEndAction(() -> btnMojeNarudzbe.animate()
                                .scaleX(1.25f)
                                .scaleY(1.25f)
                                .setDuration(200)
                                .withEndAction(() -> btnMojeNarudzbe.animate()
                                        .scaleX(1f)
                                        .scaleY(1f)
                                        .setDuration(200)
                                        .start())
                                .start())
                        .start())
                .start();
    }

    private void setupRecycler() {
        mRecyclerView.setLayoutManager(new GridLayoutManager(this, 2));
        mMenuItemList = new ArrayList<>();
        mAdapter = new MenuItemAdapter(OdabirJelaPicaActivity.this, mMenuItemList);
        mRecyclerView.setAdapter(mAdapter);

        mAdapter.setOnItemClickListener(this::otvoriModifikacijeActivity);
    }

    private void setupButtons() {
        btnHrana.setOnClickListener(v -> {
            aktivniMeni = "hrana";

            osvjeziNaslovMenija();
            ucitajMeni();
        });

        btnPica.setOnClickListener(v -> {
            aktivniMeni = "pica";
            osvjeziNaslovMenija();
            ucitajMeni();
        });

        btnMojeNarudzbe.setOnClickListener(v -> {
            int tableNumber = getIntent().getIntExtra("tableNumber", -1);
            String restaurant = getIntent().getStringExtra("restaurant");
            String qrToken = getIntent().getStringExtra("qrToken");
            String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
            Intent intent = new Intent(OdabirJelaPicaActivity.this, AktivneNarudzbeActivity.class);
            intent.putExtra("tableNumber", tableNumber);
            intent.putExtra("restaurant", restaurant);
            intent.putExtra("qrToken", qrToken);
            intent.putExtra("selectedUserId", userId);
            startActivity(intent);
        });

        btnAiChat.setOnClickListener(v -> {
            int tableNumber = getIntent().getIntExtra("tableNumber", -1);
            String restaurant = getIntent().getStringExtra("restaurant");
            String qrToken = getIntent().getStringExtra("qrToken");

            Intent intent = new Intent(OdabirJelaPicaActivity.this, ChatActivity.class);
            intent.putExtra("tableNumber", tableNumber);
            intent.putExtra("restaurant", restaurant);
            intent.putExtra("qrToken", qrToken);
            startActivity(intent);
            overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        });

        btnZavrsiNarudzbu.setOnClickListener(v -> prikaziOdabraneArtikle());
        btnPonistiNarudzbu.setOnClickListener(v -> ponistiNarudzbu());
    }

    private void setupTabs() {
        tabLayoutTop.addOnTabSelectedListener(listener);
        tabLayoutBottom.addOnTabSelectedListener(listener);
    }

    private void osvjeziNaslovMenija() {
        if (textViewMenuTitle == null) return;
        textViewMenuTitle.setText("Dobrodošao, " + dohvatiNickname());
    }

    private void ucitajMeni() {
        progressBar.setVisibility(ProgressBar.VISIBLE);

        mDatabase = FirebaseDatabase.getInstance().getReference(aktivniMeni);

        mDatabase.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                progressBar.setVisibility(ProgressBar.GONE);

                artikliPoKategorijama.clear();
                List<MenuItem> sviArtikli = new ArrayList<>();

                for (DataSnapshot itemSnapshot : snapshot.getChildren()) {
                    MenuItem item = itemSnapshot.getValue(MenuItem.class);

                    if (item != null && item.isDostupno()) {
                        sviArtikli.add(item);

                        artikliPoKategorijama
                                .computeIfAbsent(item.getCategory(), k -> new ArrayList<>())
                                .add(item);
                    }
                }

                postaviTaboveIzKategorija();

                Collator collator = Collator.getInstance(new Locale("hr", "HR"));
                sviArtikli.sort((i1, i2) -> collator.compare(i1.getName(), i2.getName()));

                List<MenuItem> stupcaniPrikaz = pretvoriUStupcaniPrikaz(sviArtikli);

                mMenuItemList.clear();
                mMenuItemList.addAll(stupcaniPrikaz);
                mAdapter.notifyDataSetChanged();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                progressBar.setVisibility(ProgressBar.GONE);
                Toast.makeText(OdabirJelaPicaActivity.this,
                        R.string.menu_load_error,
                        Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void osvjeziBrojOdabranihArtikala() {
        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        int totalSelected = preferences.getInt("total_selected", 0);
        mTextViewTotalSelected.setText(getString(R.string.selected_items_count, totalSelected));
    }

    private void postaviTaboveIzKategorija() {
        tabLayoutTop.removeAllTabs();
        tabLayoutBottom.removeAllTabs();

        List<String> kategorije = new ArrayList<>(artikliPoKategorijama.keySet());

        Collator collator = Collator.getInstance(new Locale("hr", "HR"));
        kategorije.sort(collator);

        int half = (int) Math.ceil(kategorije.size() / 2.0);

        for (int i = 0; i < kategorije.size(); i++) {
            if (i < half) {
                tabLayoutTop.addTab(tabLayoutTop.newTab().setText(kategorije.get(i)));
            } else {
                tabLayoutBottom.addTab(tabLayoutBottom.newTab().setText(kategorije.get(i)));
            }
        }
    }

    private void provjeriAktivneNarudzbeZaStol() {
        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String qrToken = getIntent().getStringExtra("qrToken");

        if (tableNumber == -1) {
            btnMojeNarudzbe.setVisibility(View.GONE);
            return;
        }

        DatabaseReference narudzbeRef = FirebaseDatabase.getInstance().getReference("narudzbe");

        narudzbeRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                boolean imaAktivnih = false;

                for (DataSnapshot narudzbaSnapshot : snapshot.getChildren()) {
                    Integer brojStola = narudzbaSnapshot.child("brojStola").getValue(Integer.class);
                    String status = narudzbaSnapshot.child("status").getValue(String.class);
                    String firebaseQrToken = narudzbaSnapshot.child("qrToken").getValue(String.class);

                    boolean istiStol = brojStola != null && brojStola == tableNumber;

                    // privremeno olabavi uvjet da testiraš
                    boolean istiQr = true;

                    boolean aktivna = status != null
                            && !status.equals("Dostavljeno")
                            && !status.equals("Otkazano");

                    if (istiStol && istiQr && aktivna) {
                        imaAktivnih = true;
                        break;
                    }
                }

                btnMojeNarudzbe.setVisibility(imaAktivnih ? View.VISIBLE : View.GONE);

                boolean highlightOrdersButton = getIntent().getBooleanExtra("highlightOrdersButton", false);

                if (imaAktivnih && highlightOrdersButton) {
                    btnMojeNarudzbe.postDelayed(() -> animirajGumbMojeNarudzbe(), 200);
                    getIntent().removeExtra("highlightOrdersButton");
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                btnMojeNarudzbe.setVisibility(View.GONE);
            }
        });
    }


    private void otvoriModifikacijeActivity(MenuItem menuItem) {
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastClickTime < 500) {
            return;
        }
        lastClickTime = currentTime;

        progressBar.setVisibility(ProgressBar.VISIBLE);

        Intent intent = new Intent(OdabirJelaPicaActivity.this, ModifikacijeActivity.class);
        intent.putExtra("proizvod", menuItem.getName());
        intent.putExtra("kategorija", menuItem.getCategory());
        intent.putExtra("imageName", menuItem.getImageName());
        intent.putExtra("imageUrl", menuItem.getImageUrl());
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        DatabaseReference modifikacijeRef = FirebaseDatabase.getInstance()
                .getReference("modifikacije")
                .child(menuItem.getName());

        modifikacijeRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
                progressBar.setVisibility(ProgressBar.GONE);

                ArrayList<String> modifikacijeList = new ArrayList<>();
                for (DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    String modifikacija = snapshot.getValue(String.class);
                    if (modifikacija != null) {
                        modifikacijeList.add(modifikacija);
                    }
                }

                intent.putStringArrayListExtra("modifikacije", modifikacijeList);
                startActivityForResult(intent, 1);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError databaseError) {
                progressBar.setVisibility(ProgressBar.GONE);
                Toast.makeText(OdabirJelaPicaActivity.this,
                        R.string.modifications_load_error,
                        Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void prikaziOdabraneArtikle() {
        Intent intent = new Intent(OdabirJelaPicaActivity.this, PregledNarudzbiActivity.class);

        int tableNumber = getIntent().getIntExtra("tableNumber", -1);
        String restaurant = getIntent().getStringExtra("restaurant");
        String qrToken = getIntent().getStringExtra("qrToken");

        intent.putExtra("tableNumber", tableNumber);
        intent.putExtra("restaurant", restaurant);
        intent.putExtra("qrToken", qrToken);

        startActivityForResult(intent, 2);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
    }

    private void ponistiNarudzbu() {
        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        editor.clear();
        editor.apply();

        mTextViewTotalSelected.setText(getString(R.string.selected_items_count, 0));
        mAdapter.notifyDataSetChanged();
    }

    private String dohvatiNickname() {
        SharedPreferences prefs = getSharedPreferences("user_data", MODE_PRIVATE);
        String nickname = prefs.getString("nickname", "Gost");

        if (nickname == null || nickname.trim().isEmpty()) {
            return "Gost";
        }

        return nickname.trim();
    }

    private void prikaziArtiklePoKategoriji(String kategorija) {
        List<MenuItem> listaArtikala = artikliPoKategorijama.getOrDefault(kategorija, new ArrayList<>());

        Collator collator = Collator.getInstance(new Locale("hr", "HR"));
        listaArtikala.sort((d1, d2) -> collator.compare(d1.getName(), d2.getName()));

        List<MenuItem> stupcaniPrikaz = pretvoriUStupcaniPrikaz(listaArtikala);

        mMenuItemList.clear();
        mMenuItemList.addAll(stupcaniPrikaz);
        mAdapter.notifyDataSetChanged();
    }

    private List<MenuItem> pretvoriUStupcaniPrikaz(List<MenuItem> source) {
        List<MenuItem> stupcaniPrikaz = new ArrayList<>();
        int brojStupaca = 2;
        int redaka = (int) Math.ceil((double) source.size() / brojStupaca);

        for (int i = 0; i < redaka; i++) {
            for (int j = 0; j < brojStupaca; j++) {
                int index = i + j * redaka;
                if (index < source.size()) {
                    stupcaniPrikaz.add(source.get(index));
                }
            }
        }

        return stupcaniPrikaz;
    }


    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();

        if (requestCode == 1 && resultCode == RESULT_OK) {
            if (data != null && data.hasExtra("kolicina")) {
                int odabranaKolicina = data.getIntExtra("kolicina", 0);
                int totalSelected = preferences.getInt("total_selected", 0);
                totalSelected += odabranaKolicina;
                editor.putInt("total_selected", totalSelected);
                editor.apply();

                mTextViewTotalSelected.setText(getString(R.string.selected_items_count, totalSelected));
            }
        } else if (requestCode == 2 && resultCode == RESULT_OK) {
            if (data != null && data.hasExtra("totalSelected")) {
                int totalSelected = data.getIntExtra("totalSelected", 0);
                editor.putInt("total_selected", totalSelected);
                editor.apply();

                mTextViewTotalSelected.setText(getString(R.string.selected_items_count, totalSelected));
            }
        } else if (requestCode == 3 && resultCode == RESULT_OK) {
            if (data != null && data.hasExtra("novaKolicina")) {
                int novaKolicina = data.getIntExtra("novaKolicina", 0);
                editor.putInt("total_selected", novaKolicina);
                editor.apply();

                mTextViewTotalSelected.setText(getString(R.string.selected_items_count, novaKolicina));
            }
        }
    }
}
