package com.bettingarbitrage.analytics.model;

public class StakeResponse {
    private String runner;
    private String providerId;
    private String providerName;
    private double odds;
    private double stakeFraction;
    private double stakeAmount;
    private double payout;

    public String getRunner() {
        return runner;
    }

    public void setRunner(String runner) {
        this.runner = runner;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public double getOdds() {
        return odds;
    }

    public void setOdds(double odds) {
        this.odds = odds;
    }

    public double getStakeFraction() {
        return stakeFraction;
    }

    public void setStakeFraction(double stakeFraction) {
        this.stakeFraction = stakeFraction;
    }

    public double getStakeAmount() {
        return stakeAmount;
    }

    public void setStakeAmount(double stakeAmount) {
        this.stakeAmount = stakeAmount;
    }

    public double getPayout() {
        return payout;
    }

    public void setPayout(double payout) {
        this.payout = payout;
    }
}
