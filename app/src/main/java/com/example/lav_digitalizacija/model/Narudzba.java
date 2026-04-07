package com.example.lav_digitalizacija.model;

import java.util.List;

public class Narudzba {

    private List<String> stavke;
    private String vrijeme;
    private int brojStola;
    private String konobar;

    public Narudzba() {
    }

    public Narudzba(List<String> stavke, String vrijeme, int brojStola, String konobar) {
        this.stavke = stavke;
        this.vrijeme = vrijeme;
        this.brojStola = brojStola;
        this.konobar = konobar;
    }

    // Getteri i setteri
    public List<String> getStavke() {
        return stavke;
    }

    public void setStavke(List<String> stavke) {
        this.stavke = stavke;
    }

    public String getVrijeme() {
        return vrijeme;
    }

    public void setVrijeme(String vrijeme) {
        this.vrijeme = vrijeme;
    }

    public int getBrojStola() {
        return brojStola;
    }

    public void setBrojStola(int brojStola) {
        this.brojStola = brojStola;
    }

    public String getKonobar() {
        return konobar;
    }

    public void setKonobar(String konobar) {
        this.konobar = konobar;
    }
}
