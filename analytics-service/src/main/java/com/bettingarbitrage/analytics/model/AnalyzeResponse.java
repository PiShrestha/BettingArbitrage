package com.bettingarbitrage.analytics.model;

import java.util.List;

public class AnalyzeResponse {

    private List<OpportunityResponse> opportunities;

    public AnalyzeResponse() {
    }

    public AnalyzeResponse(List<OpportunityResponse> opportunities) {
        this.opportunities = opportunities;
    }

    public List<OpportunityResponse> getOpportunities() {
        return opportunities;
    }

    public void setOpportunities(List<OpportunityResponse> opportunities) {
        this.opportunities = opportunities;
    }
}
