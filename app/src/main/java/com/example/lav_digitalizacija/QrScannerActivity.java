package com.example.lav_digitalizacija;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

public class QrScannerActivity extends AppCompatActivity {

    private GmsBarcodeScanner scanner;
    private String meniPozicija;

    private LinearLayout successContainer;
    private LinearLayout errorContainer;
    private TextView textError;
    private TextView textSuccess;
    private TextView textContinue;
    private boolean ponovnoSkeniranjeUTijeku = false;
    private boolean uspjesanPrikazAktivan = false;

    private int validTableNumber = -1;
    private String validRestaurant;
    private String validToken;
    private ImageView imageSuccessCircle;
    private ImageView imageSuccessCheck;

    private ImageView imageErrorCircle;
    private ImageView imageErrorClose;
    private TextView textRetry;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_qr_scanner);

        meniPozicija = getIntent().getStringExtra("meniPozicija");
        successContainer = findViewById(R.id.successContainer);
        errorContainer = findViewById(R.id.errorContainer);
        textError = findViewById(R.id.textError);
        textRetry = findViewById(R.id.textRetry);
        imageSuccessCircle = findViewById(R.id.imageSuccessCircle);
        imageSuccessCheck = findViewById(R.id.imageSuccessCheck);
        imageErrorCircle = findViewById(R.id.imageErrorCircle);
        imageErrorClose = findViewById(R.id.imageErrorClose);
        textSuccess = findViewById(R.id.textSuccess);
        textContinue = findViewById(R.id.textContinue);

        GmsBarcodeScannerOptions options =
                new GmsBarcodeScannerOptions.Builder()
                        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                        .build();

        scanner = GmsBarcodeScanning.getClient(this, options);

        errorContainer.setOnClickListener(v -> {
            if (ponovnoSkeniranjeUTijeku) {
                return;
            }

            errorContainer.setVisibility(View.GONE);
            startScanner();
        });

        successContainer.setOnClickListener(v -> {
            if (uspjesanPrikazAktivan) {
                otvoriMeni();
            }
        });

        startScanner();
    }

    private void startScanner() {
        if (ponovnoSkeniranjeUTijeku || uspjesanPrikazAktivan) {
            return;
        }

        successContainer.setVisibility(View.GONE);
        errorContainer.setVisibility(View.GONE);
        textError.setVisibility(View.GONE);

        scanner.startScan()
                .addOnSuccessListener(barcode -> {
                    String qrText = barcode.getRawValue();

                    if (qrText == null || qrText.trim().isEmpty()) {
                        prikaziNeispravanQr();
                        return;
                    }

                    handleQrResult(qrText.trim());
                })
                .addOnCanceledListener(this::finish)
                .addOnFailureListener(e -> finish());
    }

    private void handleQrResult(String qrText) {
        if (!qrText.startsWith("LAVQR:")) {
            prikaziNeispravanQr();
            return;
        }

        String token = qrText.substring(6).trim();

        if (token.isEmpty()) {
            prikaziNeispravanQr();
            return;
        }

        provjeriTokenUBazi(token);
    }

    private void provjeriTokenUBazi(String token) {
        DatabaseReference stolRef = FirebaseDatabase.getInstance()
                .getReference("stolovi")
                .child(token);

        stolRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    prikaziNeispravanQr();
                    return;
                }

                Boolean aktivan = snapshot.child("aktivan").getValue(Boolean.class);
                Integer brojStola = snapshot.child("brojStola").getValue(Integer.class);
                String restoran = snapshot.child("restoran").getValue(String.class);

                if (aktivan == null || !aktivan) {
                    prikaziNeispravanQr();
                    return;
                }

                if (brojStola == null || restoran == null || restoran.isEmpty()) {
                    prikaziNeispravanQr();
                    return;
                }

                prikaziUspjesanQr(brojStola, restoran, token);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                prikaziNeispravanQr();
            }
        });
    }



    private void prikaziNeispravanQr() {
        ponovnoSkeniranjeUTijeku = true;
        uspjesanPrikazAktivan = false;

        successContainer.setVisibility(View.GONE);
        errorContainer.setVisibility(View.VISIBLE);

        imageErrorCircle.setAlpha(0f);
        imageErrorCircle.setScaleX(0.6f);
        imageErrorCircle.setScaleY(0.6f);

        imageErrorClose.setAlpha(0f);
        imageErrorClose.setScaleX(0.6f);
        imageErrorClose.setScaleY(0.6f);

        textError.setAlpha(0f);
        textRetry.setAlpha(0f);

        textError.setText(R.string.qr_invalid);
        textRetry.setText(getString(R.string.qr_retry));
        imageErrorCircle.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(350)
                .start();

        imageErrorClose.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setStartDelay(120)
                .setDuration(300)
                .start();

        textError.animate()
                .alpha(1f)
                .setStartDelay(220)
                .setDuration(300)
                .withEndAction(() -> ponovnoSkeniranjeUTijeku = false)
                .start();

        textRetry.animate()
                .alpha(1f)
                .setStartDelay(350)
                .setDuration(300)
                .start();
    }

    private void prikaziUspjesanQr(int brojStola, String restoran, String token) {
        validTableNumber = brojStola;
        validRestaurant = restoran;
        validToken = token;

        ponovnoSkeniranjeUTijeku = false;
        uspjesanPrikazAktivan = true;

        errorContainer.setVisibility(View.GONE);
        successContainer.setVisibility(View.VISIBLE);

        imageSuccessCircle.setAlpha(0f);
        imageSuccessCircle.setScaleX(0.6f);
        imageSuccessCircle.setScaleY(0.6f);

        imageSuccessCheck.setAlpha(0f);
        imageSuccessCheck.setScaleX(0.6f);
        imageSuccessCheck.setScaleY(0.6f);

        textSuccess.setAlpha(0f);
        textContinue.setAlpha(0f);

        textSuccess.setText(getString(R.string.qr_welcome, brojStola));
        textContinue.setText(R.string.qr_continue);
        imageSuccessCircle.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(350)
                .start();

        imageSuccessCheck.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setStartDelay(120)
                .setDuration(300)
                .start();

        textSuccess.animate()
                .alpha(1f)
                .setStartDelay(220)
                .setDuration(300)
                .start();

        textContinue.animate()
                .alpha(1f)
                .setStartDelay(350)
                .setDuration(300)
                .start();
    }
    private void otvoriMeni() {
        Intent intent = new Intent(QrScannerActivity.this, OdabirJelaPicaActivity.class);
        intent.putExtra("meniPozicija", meniPozicija);
        intent.putExtra("tableNumber", validTableNumber);
        intent.putExtra("restaurant", validRestaurant);
        intent.putExtra("qrToken", validToken);
        startActivity(intent);
        finish();
    }
}