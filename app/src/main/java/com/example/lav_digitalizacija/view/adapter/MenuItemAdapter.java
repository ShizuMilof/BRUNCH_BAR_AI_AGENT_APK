package com.example.lav_digitalizacija.view.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.MenuItem;
import com.example.lav_digitalizacija.view.activity.OdabirJelaPicaActivity;
import com.example.lav_digitalizacija.view.viewholder.MenuItemViewHolder;

import java.util.List;

public class MenuItemAdapter extends RecyclerView.Adapter<MenuItemViewHolder> {

    private final List<MenuItem> menuItemList;
    private OnItemClickListener mOnItemClickListener;

    public interface OnItemClickListener {
        void onItemClick(MenuItem menuItem);
    }

    public MenuItemAdapter(OdabirJelaPicaActivity odabirJelaPicaActivity, List<MenuItem> menuItemList) {
        this.menuItemList = menuItemList;
    }

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.mOnItemClickListener = listener;
    }

    @NonNull
    @Override
    public MenuItemViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_menu, parent, false);
        return new MenuItemViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull MenuItemViewHolder holder, int position) {
        MenuItem menuItem = menuItemList.get(position);
        holder.bind(menuItem, mOnItemClickListener);
    }

    @Override
    public int getItemCount() {
        return menuItemList.size();
    }
}
