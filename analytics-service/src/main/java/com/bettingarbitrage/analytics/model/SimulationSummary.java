package com.bettingarbitrage.analytics.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SimulationSummary {
    private int trials;
    private double mean;
    private double stddev;
    @JsonProperty("pPositive")
    private double pPositive;
    private double percentile5;
    private double percentile95;

    public int getTrials() {
        return trials;
    }

    public void setTrials(int trials) {
        this.trials = trials;
    }

    public double getMean() {
        return mean;
    }

    public void setMean(double mean) {
        this.mean = mean;
    }

    public double getStddev() {
        return stddev;
    }

    public void setStddev(double stddev) {
        this.stddev = stddev;
    }

    @JsonProperty("pPositive")
    public double getPPositive() {
        return pPositive;
    }

    @JsonProperty("pPositive")
    public void setPPositive(double pPositive) {
        this.pPositive = pPositive;
    }

    public double getPercentile5() {
        return percentile5;
    }

    public void setPercentile5(double percentile5) {
        this.percentile5 = percentile5;
    }

    public double getPercentile95() {
        return percentile95;
    }

    public void setPercentile95(double percentile95) {
        this.percentile95 = percentile95;
    }
}
