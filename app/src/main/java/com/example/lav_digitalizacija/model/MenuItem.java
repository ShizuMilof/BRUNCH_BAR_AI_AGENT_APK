package com.example.lav_digitalizacija.model;

import java.util.Map;

public class MenuItem {

    private int id;
    private String name;
    private String category;
    private String opis;
    private int cijenaCent;
    private boolean dostupno;
    private boolean omiljeno;

    private String imageName;

    private String imageUrl;


    private Map<String, Boolean> alergeni;
    private Map<String, Boolean> oznake;
    private Map<String, Boolean> preporucenaPica;

    public MenuItem() {
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getOpis() {
        return opis;
    }

    public int getCijenaCent() {
        return cijenaCent;
    }

    public boolean isDostupno() {
        return dostupno;
    }

    public boolean isOmiljeno() {
        return omiljeno;
    }

    public Map<String, Boolean> getAlergeni() {
        return alergeni;
    }

    public Map<String, Boolean> getOznake() {
        return oznake;
    }

    public Map<String, Boolean> getPreporucenaPica() {
        return preporucenaPica;
    }

    public String getCijenaFormatirano() {
        double cijena = cijenaCent / 100.0;
        return String.format("%.2f €", cijena);
    }

    public String getImageName() {
        return imageName;
    }

    public void setImageName(String imageName) {
        this.imageName = imageName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

}
