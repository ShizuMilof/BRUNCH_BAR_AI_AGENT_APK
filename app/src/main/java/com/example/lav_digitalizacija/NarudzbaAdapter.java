package com.example.lav_digitalizacija;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;

public class NarudzbaAdapter extends RecyclerView.Adapter<NarudzbaAdapter.ViewHolder> {

    private final ArrayList<String> narudzbeList;
    private OnItemClickListener listener;

    public interface OnItemClickListener {
        void onItemClick(int position);
    }

    public NarudzbaAdapter(ArrayList<String> narudzbeList) {
        this.narudzbeList = narudzbeList;
    }

    public void setOnItemClickListener(OnItemClickListener listener) {
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
        String narudzba = narudzbeList.get(position);
        holder.textViewNarudzba.setText(narudzba);

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onItemClick(holder.getAdapterPosition());
            }
        });
    }

    @Override
    public int getItemCount() {
        return narudzbeList.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {

        TextView textViewNarudzba;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            textViewNarudzba = itemView.findViewById(R.id.textViewNarudzba);
        }
    }
}