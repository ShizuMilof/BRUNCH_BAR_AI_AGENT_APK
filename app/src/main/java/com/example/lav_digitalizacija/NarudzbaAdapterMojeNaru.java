package com.example.lav_digitalizacija;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import java.util.List;

public class NarudzbaAdapterMojeNaru extends RecyclerView.Adapter<NarudzbaAdapterMojeNaru.ViewHolder> {

    private final List<String> narudzbeList;
    private final Context context;

    public NarudzbaAdapterMojeNaru(List<String> narudzbeList, Context context) {
        this.narudzbeList = narudzbeList;
        this.context = context;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context)
                .inflate(R.layout.item_narudzba_pregled, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        String narudzba = narudzbeList.get(position);
        holder.textViewNarudzba.setText(narudzba);

        holder.itemView.setOnClickListener(v -> showDeleteDialog(narudzba, holder.getAdapterPosition()));
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

    private void showDeleteDialog(String narudzba, int position) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        LayoutInflater inflater = LayoutInflater.from(context);
        View view = inflater.inflate(R.layout.dialog_delete, null);
        builder.setView(view);

        Button btnYes = view.findViewById(R.id.buttonDialogYes);
        Button btnNo = view.findViewById(R.id.buttonDialogNo);

        AlertDialog dialog = builder.create();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
        dialog.show();

        btnYes.setOnClickListener(v -> {
            deleteNarudzba(narudzba, position);
            dialog.dismiss();
        });

        btnNo.setOnClickListener(v -> dialog.dismiss());
    }

    private void deleteNarudzba(String narudzba, int position) {
        String narudzbaKey = narudzba.split("\n")[0].trim();
        DatabaseReference databaseRef = FirebaseDatabase.getInstance().getReference("narudzbe");

        databaseRef.child(narudzbaKey).removeValue()
                .addOnSuccessListener(aVoid -> {
                    Toast.makeText(context, R.string.order_deleted_success, Toast.LENGTH_SHORT).show();

                    if (context instanceof PregledMojihNarudzbiActivity) {
                        ((PregledMojihNarudzbiActivity) context).reloadNarudzbe();
                    }
                })
                .addOnFailureListener(e ->
                        Toast.makeText(context, R.string.order_delete_error, Toast.LENGTH_SHORT).show()
                );
    }
}