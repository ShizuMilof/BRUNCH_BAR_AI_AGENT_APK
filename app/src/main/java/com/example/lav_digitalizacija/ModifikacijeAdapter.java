package com.example.lav_digitalizacija;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class ModifikacijeAdapter extends RecyclerView.Adapter<ModifikacijeAdapter.ModifikacijaViewHolder> {

    private final List<String> modifikacijeList;
    private final List<String> odabraneModifikacije;

    public ModifikacijeAdapter(List<String> modifikacijeList, List<String> odabraneModifikacije) {
        this.modifikacijeList = modifikacijeList;
        this.odabraneModifikacije = odabraneModifikacije;
    }

    @NonNull
    @Override
    public ModifikacijaViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_modifikacija, parent, false);
        return new ModifikacijaViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ModifikacijaViewHolder holder, int position) {
        String modifikacija = modifikacijeList.get(position);
        holder.textViewModifikacija.setText(modifikacija);

        // Provjera je li modifikacija već odabrana
        holder.checkBoxModifikacija.setChecked(odabraneModifikacije.contains(modifikacija));

        // Listener za odabir checkboxa
        holder.checkBoxModifikacija.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                odabraneModifikacije.add(modifikacija);
            } else {
                odabraneModifikacije.remove(modifikacija);
            }
        });
    }

    @Override
    public int getItemCount() {
        return modifikacijeList.size();
    }

    static class ModifikacijaViewHolder extends RecyclerView.ViewHolder {
        TextView textViewModifikacija;
        CheckBox checkBoxModifikacija;

        public ModifikacijaViewHolder(@NonNull View itemView) {
            super(itemView);
            textViewModifikacija = itemView.findViewById(R.id.textViewModifikacija);
            checkBoxModifikacija = itemView.findViewById(R.id.checkBoxModifikacija);
        }
    }
}
