package com.example.lav_digitalizacija.view.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.google.android.material.card.MaterialCardView;

import java.util.List;

public class ModifikacijeAdapter extends RecyclerView.Adapter<ModifikacijeAdapter.ModifikacijaViewHolder> {

    private final List<String> modifikacijeList;
    private final List<String> odabraneModifikacije;

    public ModifikacijeAdapter(List<String> modifikacijeList,
                               List<String> odabraneModifikacije) {
        this.modifikacijeList = modifikacijeList;
        this.odabraneModifikacije = odabraneModifikacije;
    }

    @NonNull
    @Override
    public ModifikacijaViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_modifikacija, parent, false);

        return new ModifikacijaViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ModifikacijaViewHolder holder, int position) {

        String modifikacija = modifikacijeList.get(position);

        holder.textViewModifikacija.setText(modifikacija);

        holder.checkBoxModifikacija.setOnCheckedChangeListener(null);

        boolean selected = odabraneModifikacije.contains(modifikacija);

        holder.checkBoxModifikacija.setChecked(selected);

        osvjeziKarticu(holder, selected);

        holder.itemView.setOnClickListener(v ->
                holder.checkBoxModifikacija.setChecked(!holder.checkBoxModifikacija.isChecked()));

        holder.checkBoxModifikacija.setOnCheckedChangeListener((buttonView, isChecked) -> {

            if (isChecked) {
                if (!odabraneModifikacije.contains(modifikacija)) {
                    odabraneModifikacije.add(modifikacija);
                }
            } else {
                odabraneModifikacije.remove(modifikacija);
            }

            osvjeziKarticu(holder, isChecked);
        });
    }

    private void osvjeziKarticu(ModifikacijaViewHolder holder, boolean selected) {

        if (selected) {
            holder.cardModifikacija.setStrokeColor(
                    ContextCompat.getColor(holder.itemView.getContext(), R.color.primary)
            );
            holder.cardModifikacija.setStrokeWidth(3);
        } else {
            holder.cardModifikacija.setStrokeColor(
                    ContextCompat.getColor(holder.itemView.getContext(), android.R.color.darker_gray)
            );
            holder.cardModifikacija.setStrokeWidth(1);
        }
    }

    @Override
    public int getItemCount() {
        return modifikacijeList.size();
    }

    static class ModifikacijaViewHolder extends RecyclerView.ViewHolder {

        MaterialCardView cardModifikacija;
        TextView textViewModifikacija;
        CheckBox checkBoxModifikacija;

        public ModifikacijaViewHolder(@NonNull View itemView) {
            super(itemView);

            cardModifikacija = itemView.findViewById(R.id.cardModifikacija);
            textViewModifikacija = itemView.findViewById(R.id.textViewModifikacija);
            checkBoxModifikacija = itemView.findViewById(R.id.checkBoxModifikacija);
        }
    }
}