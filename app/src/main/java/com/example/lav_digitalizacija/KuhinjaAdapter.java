package com.example.lav_digitalizacija;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

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
        holder.txtStatus.setText(status);

        if (status != null) {
            switch (status) {
                case "Narudžba zaprimljena":
                    holder.txtStatus.setTextColor(Color.WHITE);
                    break;

                case "Krenulo u izradu":
                    holder.txtStatus.setTextColor(Color.RED);
                    break;

                case "Priprema se":
                    holder.txtStatus.setTextColor(android.graphics.Color.parseColor("#FFA500"));

                    break;

                case "Uskoro stiže na vaš stol":
                    holder.txtStatus.setTextColor(Color.YELLOW);
                    break;

                case "Dostavljeno":
                    holder.txtStatus.setTextColor(android.graphics.Color.GREEN);
                    break;

                default:
                    holder.txtStatus.setTextColor(android.graphics.Color.WHITE);
                    break;
            }
        }
        StringBuilder sb = new StringBuilder();
        for (String s : n.getStavke()) {
            sb.append("• ").append(s).append("\n");
        }
        holder.txtStavke.setText(sb.toString().trim());

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