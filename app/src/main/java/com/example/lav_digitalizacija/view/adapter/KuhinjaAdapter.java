package com.example.lav_digitalizacija.view.adapter;

import android.graphics.Color;
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

public class KuhinjaAdapter extends RecyclerView.Adapter<KuhinjaAdapter.ViewHolder> {

    public interface OnClick {
        void onClick(AktivnaNarudzbaModel narudzba);
    }

    private final List<AktivnaNarudzbaModel> lista;
    private final OnClick listener;

    public KuhinjaAdapter(List<AktivnaNarudzbaModel> lista, OnClick listener) {
        this.lista = lista;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_kuhinja_narudzba, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AktivnaNarudzbaModel n = lista.get(position);

        holder.txtId.setText(n.getNarudzbaId());
        holder.txtStol.setText("Stol: " + n.getBrojStola());

        String status = n.getStatus();
        holder.txtStatus.setText(status != null ? status : "Status nije dostupan");
        holder.txtStatus.setTextColor(Color.parseColor("#212121"));

        StringBuilder sb = new StringBuilder();
        for (String s : n.getStavke()) {
            sb.append("• ").append(s).append("\n");
        }

        holder.txtStavke.setText(sb.toString().trim());
        holder.txtStavke.setTextColor(Color.parseColor("#212121"));
        holder.txtId.setTextColor(Color.parseColor("#212121"));
        holder.txtStol.setTextColor(Color.parseColor("#212121"));

        holder.card.setOnClickListener(v -> listener.onClick(n));
    }

    @Override
    public int getItemCount() {
        return lista.size();
    }


    static class ViewHolder extends RecyclerView.ViewHolder {

        CardView card;
        TextView txtId, txtStol, txtStatus, txtStavke;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            card = itemView.findViewById(R.id.cardNarudzba);
            txtId = itemView.findViewById(R.id.txtNarudzbaId);
            txtStol = itemView.findViewById(R.id.txtStol);
            txtStatus = itemView.findViewById(R.id.txtStatus);
            txtStavke = itemView.findViewById(R.id.txtStavke);
        }
    }
}