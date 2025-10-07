package com.bettingarbitrage.analytics.controller;

import com.bettingarbitrage.analytics.model.AnalyzeRequest;
import com.bettingarbitrage.analytics.model.AnalyzeResponse;
import com.bettingarbitrage.analytics.model.SimulateRequest;
import com.bettingarbitrage.analytics.model.SimulationSummary;
import com.bettingarbitrage.analytics.service.ArbitrageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AnalyticsController {

    private final ArbitrageService arbitrageService;

    public AnalyticsController(ArbitrageService arbitrageService) {
        this.arbitrageService = arbitrageService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<AnalyzeResponse> analyze(@Valid @RequestBody AnalyzeRequest request) {
        AnalyzeResponse response = arbitrageService.analyzeSnapshot(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/simulate")
    public ResponseEntity<SimulationSummary> simulate(@Valid @RequestBody SimulateRequest request) {
        SimulationSummary summary = arbitrageService.runSimulation(request);
        return ResponseEntity.ok(summary);
    }
}
