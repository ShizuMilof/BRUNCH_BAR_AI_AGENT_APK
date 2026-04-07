package com.example.lav_digitalizacija.view.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.lav_digitalizacija.R;
import com.example.lav_digitalizacija.model.ChatMessage;

import java.util.List;

public class ChatAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_USER = 1;
    private static final int TYPE_BOT = 2;

    private final List<ChatMessage> items;

    public ChatAdapter(List<ChatMessage> items) {
        this.items = items;
    }

    @Override
    public int getItemViewType(int position) {
        return items.get(position).isUser() ? TYPE_USER : TYPE_BOT;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());

        if (viewType == TYPE_USER) {
            return new UserVH(inflater.inflate(R.layout.item_message_user, parent, false));
        } else {
            return new BotVH(inflater.inflate(R.layout.item_message_bot, parent, false));
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        ChatMessage msg = items.get(position);

        if (holder instanceof UserVH) {
            ((UserVH) holder).bind(msg.getText());
        } else {
            ((BotVH) holder).bind(msg.getText());
        }

        holder.itemView.setAlpha(0f);
        holder.itemView.setTranslationY(20f);

        holder.itemView.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(200)
                .start();
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public void addMessage(ChatMessage msg) {
        items.add(msg);
        notifyItemInserted(items.size() - 1);
    }


    public int addLoadingMessage() {
        ChatMessage loading = new ChatMessage("Pišem odgovor...", false);
        items.add(loading);
        notifyItemInserted(items.size() - 1);
        return items.size() - 1;
    }

    public void removeMessage(int position) {
        if (position >= 0 && position < items.size()) {
            items.remove(position);
            notifyItemRemoved(position);
        }
    }

    // =========================

    static class UserVH extends RecyclerView.ViewHolder {
        TextView tvMessage;

        UserVH(@NonNull View itemView) {
            super(itemView);
            tvMessage = itemView.findViewById(R.id.tvMessage);
        }

        void bind(String text) {
            tvMessage.setText(text);
        }
    }

    static class BotVH extends RecyclerView.ViewHolder {
        TextView tvMessage;

        BotVH(@NonNull View itemView) {
            super(itemView);
            tvMessage = itemView.findViewById(R.id.tvMessage);
        }

        void bind(String text) {
            tvMessage.setText(text);
        }
    }
}