package com.example.lav_digitalizacija.view.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;

public class NarudzbaAdapter extends RecyclerView.Adapter<NarudzbaAdapter.ViewHolder> {

    private final ArrayList<String> narudzbeList;
    private OnQuantityChangeListener listener;

    public interface OnQuantityChangeListener {
        void onIncrease(int position);

        void onDecrease(int position);
    }

    public NarudzbaAdapter(ArrayList<String> narudzbeList) {
        this.narudzbeList = narudzbeList;
    }

    public void setOnQuantityChangeListener(OnQuantityChangeListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_narudzba, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        String stavka = narudzbeList.get(position);

        holder.textViewNaziv.setText(extractDisplayText(stavka));
        holder.textViewKolicina.setText(String.valueOf(extractQuantity(stavka)));

        holder.btnPlus.setOnClickListener(v -> {
            animatePress(v);
            animateQuantity(holder.textViewKolicina);

            int adapterPosition = holder.getAdapterPosition();
            if (listener != null && adapterPosition != RecyclerView.NO_POSITION) {
                listener.onIncrease(adapterPosition);
            }
        });

        holder.itemView.setOnClickListener(v -> {
            int adapterPosition = holder.getAdapterPosition();
            if (itemClickListener != null && adapterPosition != RecyclerView.NO_POSITION) {
                itemClickListener.onItemClick(adapterPosition);
            }
        });

        holder.btnMinus.setOnClickListener(v -> {
            animatePress(v);
            animateQuantity(holder.textViewKolicina);

            int adapterPosition = holder.getAdapterPosition();
            if (listener != null && adapterPosition != RecyclerView.NO_POSITION) {
                listener.onDecrease(adapterPosition);
            }
        });
    }

    @Override
    public int getItemCount() {
        return narudzbeList.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textViewNaziv, textViewKolicina;
        MaterialButton btnPlus, btnMinus;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            textViewNaziv = itemView.findViewById(R.id.textViewNaziv);
            textViewKolicina = itemView.findViewById(R.id.textViewKolicina);
            btnPlus = itemView.findViewById(R.id.btnPlus);
            btnMinus = itemView.findViewById(R.id.btnMinus);
        }
    }

    private void animatePress(View view) {
        view.animate()
                .scaleX(0.88f)
                .scaleY(0.88f)
                .setDuration(70)
                .withEndAction(() -> view.animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .setDuration(70)
                        .start())
                .start();
    }

    private void animateQuantity(View view) {
        view.animate()
                .scaleX(0.92f)
                .scaleY(0.92f)
                .alpha(0.7f)
                .setDuration(60)
                .withEndAction(() -> view.animate()
                        .scaleX(1f)
                        .scaleY(1f)
                        .alpha(1f)
                        .setDuration(90)
                        .start())
                .start();
    }

    private int extractQuantity(String order) {
        try {
            int start = order.lastIndexOf("(X");
            int end = order.lastIndexOf(")");

            if (start != -1 && end != -1 && end > start) {
                String quantityPart = order.substring(start + 2, end).trim();
                return Integer.parseInt(quantityPart);
            }
        } catch (Exception ignored) {
        }
        return 1;
    }

    public interface OnItemClickListener {
        void onItemClick(int position);
    }

    private OnItemClickListener itemClickListener;

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.itemClickListener = listener;
    }

    private String extractDisplayText(String order) {
        try {
            int start = order.lastIndexOf("(X");
            int end = order.lastIndexOf(")");

            String displayText = order;

            // Makni samo količinu iz prikaza, ali zadrži sve ostalo
            if (start != -1 && end != -1 && end > start) {
                String before = order.substring(0, start).trim();
                String after = order.substring(end + 1).trim();

                displayText = after.isEmpty() ? before : before + " " + after;
            }

            // Napomena uvijek ide u novi red
            displayText = displayText
                    .replace(" Napomena:", "\nNAPOMENA:")
                    .replace(" napomena:", "\nNAPOMENA:")
                    .replace("Napomena:", "\nNAPOMENA:")
                    .replace("napomena:", "\nNAPOMENA:");

            return displayText.trim();
        } catch (Exception e) {
            return order;
        }
    }
}