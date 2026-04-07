package com.example.lav_digitalizacija.model;

public class ChatMessage {
    private String text;
    private boolean isUser;
    private long timestamp;

    public ChatMessage() {
        // obavezno za Firebase
    }

    public ChatMessage(String text, boolean isUser) {
        this.text = text;
        this.isUser = isUser;
        this.timestamp = System.currentTimeMillis();
    }

    public ChatMessage(String text, boolean isUser, long timestamp) {
        this.text = text;
        this.isUser = isUser;
        this.timestamp = timestamp;
    }

    public String getText() {
        return text;
    }

    public boolean isUser() {
        return isUser;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setUser(boolean user) {
        isUser = user;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}