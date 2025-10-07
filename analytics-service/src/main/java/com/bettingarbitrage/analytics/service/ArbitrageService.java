package com.bettingarbitrage.analytics.service;

import com.bettingarbitrage.analytics.model.AnalyzeRequest;
import com.bettingarbitrage.analytics.model.AnalyzeResponse;
import com.bettingarbitrage.analytics.model.MarketSnapshot;
import com.bettingarbitrage.analytics.model.OpportunityResponse;
import com.bettingarbitrage.analytics.model.RiskMetrics;
import com.bettingarbitrage.analytics.model.SimulateRequest;
import com.bettingarbitrage.analytics.model.SimulationSummary;
import com.bettingarbitrage.analytics.model.StakeResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.DoubleSummaryStatistics;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class ArbitrageService {

    private static final int DEFAULT_SIM_TRIALS = 2000;
    private static final double DEFAULT_RISK_FREE_RATE = 0.01; // annualised

    public AnalyzeResponse analyzeSnapshot(AnalyzeRequest request) {
        List<MarketSnapshot> markets = request.getMarkets();
        Map<String, RunnerQuote> bestQuotes = bestQuotesByRunner(markets);
        Map<String, List<RunnerQuote>> grouped = groupByEventAndMarket(bestQuotes);

        List<OpportunityResponse> opportunities = new ArrayList<>();
        for (List<RunnerQuote> quotes : grouped.values()) {
            if (quotes.size() < 2) {
                continue;
            }

            double sumImplied = quotes.stream()
                .mapToDouble(RunnerQuote::getImpliedProbability)
                .sum();
            if (sumImplied >= 1.0) {
                continue;
            }

            double bankroll = request.getBankroll() > 0 ? request.getBankroll() : 1000d;
            double payoutMultiplier = 1.0 / sumImplied;
            double guaranteedProfitFraction = payoutMultiplier - 1.0;
            if (guaranteedProfitFraction < request.getMinimumEdge()) {
                continue;
            }

            List<StakeResponse> stakes = calculateStakes(quotes, bankroll, sumImplied);
            OpportunityResponse response = buildOpportunity(quotes, bankroll, sumImplied, guaranteedProfitFraction, stakes);
            RiskMetrics metrics = calculateRiskMetrics(quotes, stakes, bankroll, sumImplied);
            response.setMetrics(metrics);
            response.setSimulation(runMonteCarlo(quotes, stakes, bankroll, DEFAULT_SIM_TRIALS));
            opportunities.add(response);
        }

        opportunities.sort(Comparator.comparingDouble(OpportunityResponse::getGuaranteedProfitFraction).reversed());
        return new AnalyzeResponse(opportunities);
    }

    public SimulationSummary runSimulation(SimulateRequest request) {
        OpportunityResponse opportunity = request.getOpportunity();
        double bankroll = java.util.Optional.ofNullable(request.getBankroll())
            .orElse(opportunity.getBankroll());
        int trials = java.util.Optional.ofNullable(request.getTrials())
            .orElse(DEFAULT_SIM_TRIALS);

        List<RunnerQuote> quotes = opportunity.getStakes().stream()
            .map(stake -> new RunnerQuote(
                opportunity.getEventId(),
                opportunity.getEventName(),
                opportunity.getMarketName(),
                opportunity.getSport(),
                opportunity.getLeague(),
                stake.getRunner(),
                stake.getProviderId(),
                stake.getProviderName(),
                stake.getOdds(),
                stake.getStakeFraction() * opportunity.getSumImpliedProbability()
            ))
            .collect(Collectors.toList());

        return runMonteCarlo(quotes, opportunity.getStakes(), bankroll, trials);
    }

    private OpportunityResponse buildOpportunity(
        List<RunnerQuote> quotes,
        double bankroll,
        double sumImplied,
        double guaranteedProfitFraction,
        List<StakeResponse> stakes
    ) {
        RunnerQuote exemplar = quotes.get(0);
        OpportunityResponse opportunity = new OpportunityResponse();
        opportunity.setEventId(exemplar.getEventId());
        opportunity.setEventName(exemplar.getEventName());
        opportunity.setMarketName(exemplar.getMarketName());
        opportunity.setSport(exemplar.getSport());
        opportunity.setLeague(exemplar.getLeague());
        opportunity.setSumImpliedProbability(sumImplied);
        opportunity.setGuaranteedProfitFraction(guaranteedProfitFraction);
        opportunity.setBankroll(bankroll);
        opportunity.setStakes(stakes);
        opportunity.setCreatedAt(Instant.now());
        return opportunity;
    }

    private List<StakeResponse> calculateStakes(List<RunnerQuote> quotes, double bankroll, double sumImplied) {
        List<StakeResponse> stakes = new ArrayList<>();
        for (RunnerQuote quote : quotes) {
            double stakeFraction = quote.getImpliedProbability() / sumImplied;
            double stakeAmount = stakeFraction * bankroll;
            double payout = stakeAmount * quote.getOdds();

            StakeResponse stake = new StakeResponse();
            stake.setRunner(quote.getRunnerName());
            stake.setProviderId(quote.getProviderId());
            stake.setProviderName(quote.getProviderName());
            stake.setOdds(quote.getOdds());
            stake.setStakeFraction(stakeFraction);
            stake.setStakeAmount(stakeAmount);
            stake.setPayout(payout);
            stakes.add(stake);
        }
        return stakes;
    }

    private RiskMetrics calculateRiskMetrics(List<RunnerQuote> quotes, List<StakeResponse> stakes, double bankroll, double sumImplied) {
        RiskMetrics metrics = new RiskMetrics();
        double normaliser = quotes.stream().mapToDouble(RunnerQuote::getImpliedProbability).sum();

        List<Double> profits = new ArrayList<>();
        double expectedValue = 0.0;
        for (int i = 0; i < quotes.size(); i++) {
            RunnerQuote quote = quotes.get(i);
            StakeResponse stake = stakes.get(i);
            double probability = quote.getImpliedProbability() / normaliser;
            double profit = stake.getPayout() - bankroll;
            profits.add(profit);
            expectedValue += probability * profit;
        }

        double variance = 0.0;
        for (int i = 0; i < quotes.size(); i++) {
            RunnerQuote quote = quotes.get(i);
            double probability = quote.getImpliedProbability() / normaliser;
            double profit = profits.get(i);
            variance += probability * Math.pow(profit - expectedValue, 2);
        }

        double stddev = Math.sqrt(Math.max(variance, 0));
        double winProbability = 0.0;
        for (int i = 0; i < quotes.size(); i++) {
            double probability = quotes.get(i).getImpliedProbability() / normaliser;
            if (profits.get(i) > 0) {
                winProbability += probability;
            }
        }

        Double kelly = quotes.stream()
            .map(quote -> {
                double probability = quote.getImpliedProbability() / normaliser;
                double b = quote.getOdds() - 1.0;
                double q = 1.0 - probability;
                if (b == 0) {
                    return 0.0;
                }
                double value = (probability * b - q) / b;
                if (!Double.isFinite(value)) {
                    return 0.0;
                }
                double clipped = Math.max(0.0, value);
                return Math.min(1.0, clipped);
            })
            .max(Double::compareTo)
            .orElse(0.0);

        List<Double> sortedProfits = new ArrayList<>(profits);
        sortedProfits.sort(Double::compareTo);
        int varIndex = Math.max(0, (int) Math.floor(sortedProfits.size() * 0.05) - 1);
        if (sortedProfits.isEmpty()) {
            sortedProfits.add(0.0);
        }
        double valueAtRisk = sortedProfits.get(Math.max(0, Math.min(varIndex, sortedProfits.size() - 1)));
        Double maxDrawdown = null; // requires time series; placeholder

        Double sharpeRatio = null;
        if (stddev > 0) {
            double dailyRf = DEFAULT_RISK_FREE_RATE / 252.0;
            double excessReturn = (expectedValue / bankroll) - dailyRf;
            double volatility = stddev / bankroll;
            sharpeRatio = excessReturn / volatility;
        }

        metrics.setExpectedValue(expectedValue);
        metrics.setStandardDeviation(stddev);
        metrics.setWinProbability(Math.min(1.0, winProbability));
        metrics.setKellyFraction(kelly);
        metrics.setValueAtRisk(valueAtRisk);
        metrics.setMaxDrawdown(maxDrawdown);
        metrics.setSharpeRatio(sharpeRatio);
        return metrics;
    }

    private SimulationSummary runMonteCarlo(List<RunnerQuote> quotes, List<StakeResponse> stakes, double bankroll, int trials) {
        List<Double> probabilities = new ArrayList<>();
        double normaliser = quotes.stream().mapToDouble(RunnerQuote::getImpliedProbability).sum();
        for (RunnerQuote quote : quotes) {
            probabilities.add(quote.getImpliedProbability() / normaliser);
        }

        List<Double> outcomes = new ArrayList<>(trials);
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        for (int i = 0; i < trials; i++) {
            double sample = rng.nextDouble();
            double cumulative = 0.0;
            double profit = -bankroll;
            for (int j = 0; j < probabilities.size(); j++) {
                cumulative += probabilities.get(j);
                if (sample <= cumulative || j == probabilities.size() - 1) {
                    profit += stakes.get(j).getPayout();
                    break;
                }
            }
            outcomes.add(profit);
        }

        DoubleSummaryStatistics stats = outcomes.stream().mapToDouble(Double::doubleValue).summaryStatistics();
        double mean = stats.getAverage();
        double variance = outcomes.stream()
            .mapToDouble(v -> Math.pow(v - mean, 2))
            .sum() / trials;
        double stddev = Math.sqrt(Math.max(variance, 0));

        outcomes.sort(Double::compareTo);
        int index5 = Math.max(0, (int) Math.floor(trials * 0.05) - 1);
        int index95 = Math.min(trials - 1, (int) Math.floor(trials * 0.95));
        double percentile5 = outcomes.get(index5);
        double percentile95 = outcomes.get(index95);
        long positiveCount = outcomes.stream().filter(v -> v > 0).count();

        SimulationSummary summary = new SimulationSummary();
        summary.setTrials(trials);
        summary.setMean(mean);
        summary.setStddev(stddev);
        summary.setPPositive((double) positiveCount / trials);
        summary.setPercentile5(percentile5);
        summary.setPercentile95(percentile95);
        return summary;
    }

    private Map<String, RunnerQuote> bestQuotesByRunner(List<MarketSnapshot> markets) {
        Map<String, RunnerQuote> bestQuotes = new HashMap<>();
        for (MarketSnapshot market : markets) {
            String key = groupingKey(market);
            RunnerQuote existing = bestQuotes.get(key);
            if (existing == null || existing.getOdds() < market.getOddsDecimal()) {
                bestQuotes.put(key, new RunnerQuote(market));
            }
        }
        return bestQuotes;
    }

    private Map<String, List<RunnerQuote>> groupByEventAndMarket(Map<String, RunnerQuote> quotes) {
        Map<String, List<RunnerQuote>> grouped = new HashMap<>();
        for (RunnerQuote quote : quotes.values()) {
            String key = eventMarketKey(quote.getEventId(), quote.getMarketName());
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(quote);
        }
        return grouped;
    }

    private String groupingKey(MarketSnapshot market) {
        return eventMarketKey(market.getEventId(), market.getMarketName()) + "::" + market.getRunner().getId();
    }

    private String eventMarketKey(String eventId, String marketName) {
        return eventId + "::" + marketName.toLowerCase(Locale.ROOT);
    }

    private static class RunnerQuote {
        private final String eventId;
        private final String eventName;
        private final String marketName;
        private final String sport;
        private final String league;
        private final String runnerId;
        private final String runnerName;
        private final String providerId;
        private final String providerName;
        private final double odds;
        private final double impliedProbability;

        RunnerQuote(MarketSnapshot snapshot) {
            this.eventId = snapshot.getEventId();
            this.eventName = snapshot.getEventName();
            this.marketName = snapshot.getMarketName();
            this.sport = snapshot.getSport();
            this.league = snapshot.getLeague();
            this.runnerId = snapshot.getRunner().getId();
            this.runnerName = snapshot.getRunner().getName();
            this.providerId = snapshot.getProvider().getId();
            this.providerName = snapshot.getProvider().getName();
            this.odds = snapshot.getOddsDecimal();
            this.impliedProbability = 1.0 / snapshot.getOddsDecimal();
        }

        RunnerQuote(String eventId,
                    String eventName,
                    String marketName,
                    String sport,
                    String league,
                    String runnerName,
                    String providerId,
                    String providerName,
                    double odds,
                    double impliedProbability
        ) {
            this.eventId = eventId;
            this.eventName = eventName;
            this.marketName = marketName;
            this.sport = sport;
            this.league = league;
            this.runnerId = null;
            this.runnerName = runnerName;
            this.providerId = providerId;
            this.providerName = providerName;
            this.odds = odds;
            this.impliedProbability = impliedProbability;
        }

        public String getEventId() {
            return eventId;
        }

        public String getEventName() {
            return eventName;
        }

        public String getMarketName() {
            return marketName;
        }

        public String getSport() {
            return sport;
        }

        public String getLeague() {
            return league;
        }

        public String getRunnerId() {
            return runnerId;
        }

        public String getRunnerName() {
            return runnerName;
        }

        public String getProviderId() {
            return providerId;
        }

        public String getProviderName() {
            return providerName;
        }

        public double getOdds() {
            return odds;
        }

        public double getImpliedProbability() {
            return impliedProbability;
        }
    }
}
