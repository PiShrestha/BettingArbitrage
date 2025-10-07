package com.bettingarbitrage.analytics.model;

public class RiskMetrics {
    private double expectedValue;
    private double standardDeviation;
    private double winProbability;
    private Double kellyFraction;
    private Double sharpeRatio;
    private Double valueAtRisk;
    private Double maxDrawdown;

    public double getExpectedValue() {
        return expectedValue;
    }

    public void setExpectedValue(double expectedValue) {
        this.expectedValue = expectedValue;
    }

    public double getStandardDeviation() {
        return standardDeviation;
    }

    public void setStandardDeviation(double standardDeviation) {
        this.standardDeviation = standardDeviation;
    }

    public double getWinProbability() {
        return winProbability;
    }

    public void setWinProbability(double winProbability) {
        this.winProbability = winProbability;
    }

    public Double getKellyFraction() {
        return kellyFraction;
    }

    public void setKellyFraction(Double kellyFraction) {
        this.kellyFraction = kellyFraction;
    }

    public Double getSharpeRatio() {
        return sharpeRatio;
    }

    public void setSharpeRatio(Double sharpeRatio) {
        this.sharpeRatio = sharpeRatio;
    }

    public Double getValueAtRisk() {
        return valueAtRisk;
    }

    public void setValueAtRisk(Double valueAtRisk) {
        this.valueAtRisk = valueAtRisk;
    }

    public Double getMaxDrawdown() {
        return maxDrawdown;
    }

    public void setMaxDrawdown(Double maxDrawdown) {
        this.maxDrawdown = maxDrawdown;
    }
}
