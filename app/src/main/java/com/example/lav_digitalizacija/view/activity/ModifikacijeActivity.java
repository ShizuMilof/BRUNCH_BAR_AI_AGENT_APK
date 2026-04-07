package com.example.lav_digitalizacija.view.activity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.view.adapter.ModifikacijeAdapter;
import com.google.common.reflect.TypeToken;
import com.google.gson.Gson;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class ModifikacijeActivity extends AppCompatActivity {

    private TextView textViewPiceNaziv;
    private TextView textViewKolicinaBroj;
    private TextView textViewOdaberiModifikacije;
    private RecyclerView recyclerViewModifikacije;
    private Button btnMinus;
    private Button btnPlus;
    private Button btnDodajUNarudzbu;
    private EditText editTextNapomena;
    private ImageView imageViewBackground;

    private String nazivPica;
    private List<String> modifikacijeList;
    private int kolicina = 1;

    private List<String> odabraneModifikacije;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_modifikacije);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        imageViewBackground = findViewById(R.id.imageViewBackground);
        textViewPiceNaziv = findViewById(R.id.textViewPiceNaziv);
        textViewKolicinaBroj = findViewById(R.id.textViewKolicinaBroj);
        textViewOdaberiModifikacije = findViewById(R.id.textViewOdaberiModifikacije);
        recyclerViewModifikacije = findViewById(R.id.recyclerViewModifikacije);
        btnMinus = findViewById(R.id.btnMinus);
        btnPlus = findViewById(R.id.btnPlus);
        btnDodajUNarudzbu = findViewById(R.id.btnDodajUNarudzbu);
        editTextNapomena = findViewById(R.id.editTextNapomena);

        odabraneModifikacije = new ArrayList<>();

        Intent intent = getIntent();
        nazivPica = intent.getStringExtra("proizvod");
        modifikacijeList = intent.getStringArrayListExtra("modifikacije");
        String imageUrl = intent.getStringExtra("imageUrl");

        if (nazivPica == null) {
            nazivPica = "";
        }

        if (modifikacijeList == null) {
            modifikacijeList = new ArrayList<>();
        }

        textViewPiceNaziv.setText(nazivPica);
        textViewKolicinaBroj.setText(String.valueOf(kolicina));

        if (imageUrl != null && !imageUrl.isEmpty()) {
            Glide.with(this)
                    .load(imageUrl)
                    .placeholder(R.drawable.ray)
                    .error(R.drawable.ray)
                    .into(imageViewBackground);
        } else {
            imageViewBackground.setImageResource(R.drawable.ray);
        }

        if (modifikacijeList.isEmpty()) {
            textViewOdaberiModifikacije.setVisibility(View.GONE);
            recyclerViewModifikacije.setVisibility(View.GONE);
        } else {
            recyclerViewModifikacije.setVisibility(View.VISIBLE);
            textViewOdaberiModifikacije.setVisibility(View.VISIBLE);
            recyclerViewModifikacije.setLayoutManager(new LinearLayoutManager(this));
            recyclerViewModifikacije.setAdapter(
                    new ModifikacijeAdapter(modifikacijeList, odabraneModifikacije)
            );
        }

        btnMinus.setOnClickListener(v -> smanjiKolicinu());
        btnPlus.setOnClickListener(v -> povecajKolicinu());
        btnDodajUNarudzbu.setOnClickListener(v -> dodajUNarudzbu());
    }

    private void smanjiKolicinu() {
        if (kolicina > 1) {
            kolicina--;
            textViewKolicinaBroj.setText(String.valueOf(kolicina));
        }
    }

    private void povecajKolicinu() {
        kolicina++;
        textViewKolicinaBroj.setText(String.valueOf(kolicina));
    }

    private void dodajUNarudzbu() {
        String napomena = editTextNapomena.getText().toString().trim();
        StringBuilder narudzba = new StringBuilder();
        narudzba.append(nazivPica);

        if (!odabraneModifikacije.isEmpty()) {
            narudzba.append(getString(R.string.order_modifications_prefix))
                    .append(String.join(", ", odabraneModifikacije));
        }

        narudzba.append(getString(R.string.order_quantity_format, kolicina));

        if (!napomena.isEmpty()) {
            narudzba.append(getString(R.string.order_note_prefix))
                    .append(napomena);
        }

        SharedPreferences preferences = getSharedPreferences("narudzba", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Gson gson = new Gson();

        String json = preferences.getString("narudzbe", null);
        Type type = new TypeToken<ArrayList<String>>() {
        }.getType();
        ArrayList<String> narudzbeList = json == null
                ? new ArrayList<>()
                : gson.fromJson(json, type);

        narudzbeList.add(narudzba.toString());
        editor.putString("narudzbe", gson.toJson(narudzbeList));
        editor.apply();

        Log.d("NARUDZBE", "Pohranjene narudžbe: " + narudzbeList);

        Intent resultIntent = new Intent();
        resultIntent.putExtra("kolicina", kolicina);
        setResult(RESULT_OK, resultIntent);
        finish();
    }
}