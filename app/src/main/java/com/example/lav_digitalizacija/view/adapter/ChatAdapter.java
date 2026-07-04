package com.example.lav_digitalizacija.view.adapter;

import android.content.Context;
import android.content.SharedPreferences;
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

    TextView tvAvatar;
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

    private String formatDisplayItem(String raw) {
        if (raw == null) return "";

        String trimmed = raw.trim();

        // Formatiraj SAMO ako tekst izgleda kao stvarna stavka narudžbe
        boolean looksLikeOrderItem =
                trimmed.matches(".*\\(X\\d+\\)$");

        if (!looksLikeOrderItem) {
            return raw;
        }

        try {
            int quantity = 1;

            int start = trimmed.lastIndexOf("(X");
            int end = trimmed.lastIndexOf(")");
            if (start != -1 && end != -1) {
                quantity = Integer.parseInt(trimmed.substring(start + 2, end));
            }

            String base = trimmed;

            if (start != -1) {
                base = base.substring(0, start).trim();
            }

            if (base.contains("MODIFIKACIJE:")) {
                String[] parts = base.split("MODIFIKACIJE:");
                String item = parts[0].replace("-", "").trim();
                String mods = parts.length > 1 ? parts[1].trim() : "";

                return quantity + "x " + capitalize(item + " " + mods);
            }

            return quantity + "x " + capitalize(base);

        } catch (Exception e) {
            return raw;
        }
    }

    private static String getNickname(Context context) {
        SharedPreferences prefs =
                context.getSharedPreferences("user_data", Context.MODE_PRIVATE);

        return prefs.getString("nickname", "G");
    }


    private String capitalize(String text) {
        if (text == null || text.isEmpty()) return text;

        String[] words = text.toLowerCase().split(" ");
        StringBuilder result = new StringBuilder();

        for (String w : words) {
            if (w.isEmpty()) continue;
            result.append(Character.toUpperCase(w.charAt(0)))
                    .append(w.substring(1))
                    .append(" ");
        }

        return result.toString().trim();
    }
    // =========================

    static class UserVH extends RecyclerView.ViewHolder {
        TextView tvMessage;
        TextView tvAvatar;

        UserVH(@NonNull View itemView) {
            super(itemView);
            tvMessage = itemView.findViewById(R.id.tvMessage);
            tvAvatar = itemView.findViewById(R.id.tvAvatar);
        }

        void bind(String text) {
            tvMessage.setText(text);

            if (tvAvatar != null) {
                String nickname = getNickname(itemView.getContext());

                if (nickname != null && !nickname.trim().isEmpty()) {
                    tvAvatar.setText(String.valueOf(Character.toUpperCase(nickname.trim().charAt(0))));
                } else {
                    tvAvatar.setText("G");
                }
            }
        }
    }


    class BotVH extends RecyclerView.ViewHolder {
        TextView tvMessage;

        BotVH(@NonNull View itemView) {
            super(itemView);
            tvMessage = itemView.findViewById(R.id.tvMessage);
        }

        void bind(String text) {
            tvMessage.setText(formatDisplayItem(text));
        }
    }
}