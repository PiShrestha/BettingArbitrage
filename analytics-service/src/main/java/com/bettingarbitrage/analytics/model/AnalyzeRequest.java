package com.bettingarbitrage.analytics.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public class AnalyzeRequest {

    @NotNull
    private Instant snapshotTime;

    @Min(0)
    private double bankroll;

    @Min(0)
    private double minimumEdge;

    @NotEmpty
    @Valid
    private List<MarketSnapshot> markets;

    public Instant getSnapshotTime() {
        return snapshotTime;
    }

    public void setSnapshotTime(Instant snapshotTime) {
        this.snapshotTime = snapshotTime;
    }

    public double getBankroll() {
        return bankroll;
    }

    public void setBankroll(double bankroll) {
        this.bankroll = bankroll;
    }

    public double getMinimumEdge() {
        return minimumEdge;
    }

    public void setMinimumEdge(double minimumEdge) {
        this.minimumEdge = minimumEdge;
    }

    public List<MarketSnapshot> getMarkets() {
        return markets;
    }

    public void setMarkets(List<MarketSnapshot> markets) {
        this.markets = markets;
    }
}
