package com.bettingarbitrage.analytics.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class OpportunityResponse {

    private String eventId;
    private String eventName;
    private String marketName;
    private String sport;
    private String league;
    private double sumImpliedProbability;
    private double guaranteedProfitFraction;
    private double bankroll;
    private Instant createdAt;
    private List<StakeResponse> stakes;
    private RiskMetrics metrics;
    private SimulationSummary simulation;

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public String getMarketName() {
        return marketName;
    }

    public void setMarketName(String marketName) {
        this.marketName = marketName;
    }

    public String getSport() {
        return sport;
    }

    public void setSport(String sport) {
        this.sport = sport;
    }

    public String getLeague() {
        return league;
    }

    public void setLeague(String league) {
        this.league = league;
    }

    public double getSumImpliedProbability() {
        return sumImpliedProbability;
    }

    public void setSumImpliedProbability(double sumImpliedProbability) {
        this.sumImpliedProbability = sumImpliedProbability;
    }

    public double getGuaranteedProfitFraction() {
        return guaranteedProfitFraction;
    }

    public void setGuaranteedProfitFraction(double guaranteedProfitFraction) {
        this.guaranteedProfitFraction = guaranteedProfitFraction;
    }

    public double getBankroll() {
        return bankroll;
    }

    public void setBankroll(double bankroll) {
        this.bankroll = bankroll;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<StakeResponse> getStakes() {
        return stakes;
    }

    public void setStakes(List<StakeResponse> stakes) {
        this.stakes = stakes;
    }

    public RiskMetrics getMetrics() {
        return metrics;
    }

    public void setMetrics(RiskMetrics metrics) {
        this.metrics = metrics;
    }

    public SimulationSummary getSimulation() {
        return simulation;
    }

    public void setSimulation(SimulationSummary simulation) {
        this.simulation = simulation;
    }
}
