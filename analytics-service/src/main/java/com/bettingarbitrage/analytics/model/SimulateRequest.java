package com.bettingarbitrage.analytics.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class SimulateRequest {

    @NotNull
    @Valid
    private OpportunityResponse opportunity;

    @Min(1)
    private Integer trials;

    @Min(0)
    private Double bankroll;

    public OpportunityResponse getOpportunity() {
        return opportunity;
    }

    public void setOpportunity(OpportunityResponse opportunity) {
        this.opportunity = opportunity;
    }

    public Integer getTrials() {
        return trials;
    }

    public void setTrials(Integer trials) {
        this.trials = trials;
    }

    public Double getBankroll() {
        return bankroll;
    }

    public void setBankroll(Double bankroll) {
        this.bankroll = bankroll;
    }
}
