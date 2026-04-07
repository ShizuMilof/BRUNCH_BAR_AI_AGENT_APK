package com.example.lav_digitalizacija.view.viewholder;

import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.MenuItem;
import com.example.lav_digitalizacija.view.adapter.MenuItemAdapter;

public class MenuItemViewHolder extends RecyclerView.ViewHolder {

    private final TextView textViewName;
    private final TextView textViewCijena;

    public MenuItemViewHolder(@NonNull View itemView) {
        super(itemView);

        textViewName = itemView.findViewById(R.id.textViewName);
        textViewCijena = itemView.findViewById(R.id.textViewCijena);
    }

    public void bind(MenuItem menuItem, MenuItemAdapter.OnItemClickListener listener) {
        textViewName.setText(menuItem.getName());
        textViewCijena.setText(menuItem.getCijenaFormatirano());

        itemView.setAlpha(menuItem.isDostupno() ? 1f : 0.6f);

        itemView.setOnClickListener(v -> {
            if (listener != null && menuItem.isDostupno()) {
                listener.onItemClick(menuItem);
            }
        });
    }
}