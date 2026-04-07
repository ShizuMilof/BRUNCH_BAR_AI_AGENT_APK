package com.example.lav_digitalizacija.view.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.AktivnaNarudzbaModel;

import java.util.List;

public class AktivneNarudzbeAdapter extends RecyclerView.Adapter<AktivneNarudzbeAdapter.ViewHolder> {

    public interface OnNarudzbaClickListener {
        void onNarudzbaClick(AktivnaNarudzbaModel narudzba);
    }

    private final List<AktivnaNarudzbaModel> lista;
    private final OnNarudzbaClickListener listener;

    public AktivneNarudzbeAdapter(List<AktivnaNarudzbaModel> lista, OnNarudzbaClickListener listener) {
        this.lista = lista;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_aktivna_narudzba, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AktivnaNarudzbaModel narudzba = lista.get(position);

        holder.txtNarudzbaId.setText(narudzba.getNarudzbaId());
        holder.txtStatus.setText("Status: " + narudzba.getStatus());
        holder.txtVrijeme.setText("Vrijeme: " + (narudzba.getVrijeme() != null ? narudzba.getVrijeme() : "-"));

        StringBuilder stavkeBuilder = new StringBuilder();
        if (narudzba.getStavke() != null) {
            for (String stavka : narudzba.getStavke()) {
                stavkeBuilder.append("• ").append(stavka).append("\n");
            }
        }
        holder.txtStavke.setText(stavkeBuilder.toString().trim());

        holder.cardNarudzba.setOnClickListener(v -> listener.onNarudzbaClick(narudzba));
    }

    @Override
    public int getItemCount() {
        return lista.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        CardView cardNarudzba;
        TextView txtNarudzbaId;
        TextView txtStatus;
        TextView txtVrijeme;
        TextView txtStavke;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            cardNarudzba = itemView.findViewById(R.id.cardNarudzba);
            txtNarudzbaId = itemView.findViewById(R.id.txtNarudzbaId);
            txtStatus = itemView.findViewById(R.id.txtStatus);
            txtVrijeme = itemView.findViewById(R.id.txtVrijeme);
            txtStavke = itemView.findViewById(R.id.txtStavke);
        }
    }
}