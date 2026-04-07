package com.example.lav_digitalizacija.model;

import java.util.List;

public class AktivnaNarudzbaModel {

    private String narudzbaId;
    private int brojStola;
    private String status;
    private String vrijeme;
    private List<String> stavke;

    public AktivnaNarudzbaModel() {
    }

    public AktivnaNarudzbaModel(String narudzbaId, int brojStola, String status, String vrijeme, List<String> stavke) {
        this.narudzbaId = narudzbaId;
        this.brojStola = brojStola;
        this.status = status;
        this.vrijeme = vrijeme;
        this.stavke = stavke;
    }

    public String getNarudzbaId() {
        return narudzbaId;
    }

    public int getBrojStola() {
        return brojStola;
    }

    public String getStatus() {
        return status;
    }

    public String getVrijeme() {
        return vrijeme;
    }

    public List<String> getStavke() {
        return stavke;
    }
}