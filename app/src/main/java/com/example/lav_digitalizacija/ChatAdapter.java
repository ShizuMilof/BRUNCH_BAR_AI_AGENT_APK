package com.example.lav_digitalizacija;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

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
            View view = inflater.inflate(R.layout.item_message_user, parent, false);
            return new UserVH(view);
        } else {
            View view = inflater.inflate(R.layout.item_message_bot, parent, false);
            return new BotVH(view);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        ChatMessage msg = items.get(position);

        if (holder instanceof UserVH) {
            ((UserVH) holder).bind(msg.getText());
        } else if (holder instanceof BotVH) {
            ((BotVH) holder).bind(msg.getText());
        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public void addMessage(ChatMessage msg) {
        items.add(msg);
        notifyItemInserted(items.size() - 1);
    }

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
