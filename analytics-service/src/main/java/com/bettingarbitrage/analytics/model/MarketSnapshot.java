package com.bettingarbitrage.analytics.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class MarketSnapshot {

    @NotBlank
    private String eventId;

    @NotBlank
    private String eventName;

    @NotBlank
    private String marketName;

    private String sport;

    private String league;

    @NotNull
    @Valid
    private Runner runner;

    @NotNull
    @Valid
    private Provider provider;

    @NotNull
    private Double oddsDecimal;

    @NotNull
    private Double impliedProbability;

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

    public Runner getRunner() {
        return runner;
    }

    public void setRunner(Runner runner) {
        this.runner = runner;
    }

    public Provider getProvider() {
        return provider;
    }

    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public Double getOddsDecimal() {
        return oddsDecimal;
    }

    public void setOddsDecimal(Double oddsDecimal) {
        this.oddsDecimal = oddsDecimal;
    }

    public Double getImpliedProbability() {
        return impliedProbability;
    }

    public void setImpliedProbability(Double impliedProbability) {
        this.impliedProbability = impliedProbability;
    }

    public static class Runner {
        @NotBlank
        private String id;

        @NotBlank
        private String name;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class Provider {
        @NotBlank
        private String id;

        @NotBlank
        private String name;

        private String slug;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getSlug() {
            return slug;
        }

        public void setSlug(String slug) {
            this.slug = slug;
        }
    }
}
