package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.model.Tool;
import com.cncsmartcore.monitoring.model.ToolUsage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Integrates with the Python Flask/FastAPI ML microservice for:
 * - Machine failure prediction
 * - Tool remaining useful life (RUL) estimation
 * - Anomaly detection
 *
 * Falls back to rule-based heuristics if ML service is unavailable.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MLIntegrationService {

    private final WebClient mlWebClient;

    @Value("${cnc.ml-service.timeout-seconds:5}")
    private int timeoutSeconds;

    @Value("${cnc.ml-service.enabled:true}")
    private boolean mlEnabled;

    // ─── Failure Prediction ───────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> predictFailureProbability(Long machineId,
                                                          List<MachineMetrics> metrics,
                                                          Map<String, Double> stats) {
        if (!mlEnabled) {
            return ruleBasedFailurePrediction(stats);
        }

        try {
            Map<String, Object> payload = buildFailurePredictionPayload(machineId, metrics, stats);

            Map<String, Object> response = mlWebClient.post()
                    .uri("/predict/failure")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .onErrorResume(e -> {
                        log.warn("ML service unavailable, using rule-based fallback: {}", e.getMessage());
                        return Mono.just(ruleBasedFailurePrediction(stats));
                    })
                    .block();

            return response != null ? response : ruleBasedFailurePrediction(stats);

        } catch (Exception e) {
            log.error("ML failure prediction error: {}", e.getMessage());
            return ruleBasedFailurePrediction(stats);
        }
    }

    // ─── Tool Remaining Life (RUL) ────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> predictToolRemainingLife(Tool tool, ToolUsage usage) {
        if (!mlEnabled) {
            return ruleBasedToolRUL(tool);
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("tool_code", tool.getToolCode());
            payload.put("tool_type", tool.getToolType().name());
            payload.put("material", tool.getMaterial());
            payload.put("current_wear_pct", tool.getWearPercentage());
            payload.put("used_life_minutes", tool.getUsedLifeMinutes());
            payload.put("max_life_minutes", tool.getMaxLifeMinutes());
            payload.put("avg_spindle_speed", usage.getAvgSpindleSpeed());
            payload.put("avg_feed_rate", usage.getAvgFeedRate());
            payload.put("avg_cutting_force", usage.getAvgCuttingForce());
            payload.put("diameter", tool.getDiameter());

            Map<String, Object> response = mlWebClient.post()
                    .uri("/predict/tool-rul")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .onErrorResume(e -> {
                        log.warn("ML RUL prediction unavailable: {}", e.getMessage());
                        return Mono.just(ruleBasedToolRUL(tool));
                    })
                    .block();

            return response != null ? response : ruleBasedToolRUL(tool);

        } catch (Exception e) {
            log.error("ML tool RUL error: {}", e.getMessage());
            return ruleBasedToolRUL(tool);
        }
    }

    // ─── Anomaly Detection ────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> detectAnomalies(Long machineId, MachineMetrics metrics) {
        if (!mlEnabled) {
            return Collections.singletonMap("anomaly_detected", false);
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("machine_id", machineId);
            payload.put("temperature", metrics.getTemperature());
            payload.put("vibration_x", metrics.getVibrationX());
            payload.put("vibration_y", metrics.getVibrationY());
            payload.put("vibration_z", metrics.getVibrationZ());
            payload.put("spindle_speed", metrics.getSpindleSpeed());
            payload.put("spindle_load", metrics.getSpindleLoad());
            payload.put("power_consumption", metrics.getPowerConsumption());
            payload.put("cutting_force", metrics.getCuttingForce());

            return mlWebClient.post()
                    .uri("/detect/anomaly")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .onErrorReturn(Collections.singletonMap("anomaly_detected", false))
                    .block();

        } catch (Exception e) {
            log.error("ML anomaly detection error: {}", e.getMessage());
            return Collections.singletonMap("anomaly_detected", false);
        }
    }

    // ─── Rule-based Fallbacks ─────────────────────────────────────────────────

    private Map<String, Object> ruleBasedFailurePrediction(Map<String, Double> stats) {
        double score = 0.0;
        String component = "general";

        double tempMean  = stats.getOrDefault("temp_mean", 0.0);
        double vibMax    = stats.getOrDefault("vibration_rms_max", 0.0);
        double loadMean  = stats.getOrDefault("spindle_load_mean", 0.0);

        if (tempMean > 80)  { score += 0.4; component = "thermal"; }
        else if (tempMean > 70) score += 0.2;

        if (vibMax > 8)  { score += 0.4; component = "bearing"; }
        else if (vibMax > 5) score += 0.2;

        if (loadMean > 90) { score += 0.3; component = "spindle"; }
        else if (loadMean > 80) score += 0.1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("failure_probability", Math.min(1.0, score));
        result.put("component", component);
        result.put("source", "rule_based");
        return result;
    }

    private Map<String, Object> ruleBasedToolRUL(Tool tool) {
        double remainingPct = 100.0 - tool.getWearPercentage();
        double remainingLife = tool.getMaxLifeMinutes() != null
                ? tool.getMaxLifeMinutes() * remainingPct / 100.0 : 60.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("remaining_life_minutes", remainingLife);
        result.put("remaining_wear_pct", remainingPct);
        result.put("source", "rule_based");
        return result;
    }

    // ─── Payload builder ──────────────────────────────────────────────────────

    private Map<String, Object> buildFailurePredictionPayload(Long machineId,
                                                               List<MachineMetrics> metrics,
                                                               Map<String, Double> stats) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("machine_id", machineId);
        payload.put("stats", stats);
        payload.put("window_size", metrics.size());

        // Send last 20 readings as time-series features
        List<Map<String, Object>> series = metrics.stream()
                .skip(Math.max(0, metrics.size() - 20))
                .map(m -> {
                    Map<String, Object> pt = new LinkedHashMap<>();
                    pt.put("ts", m.getRecordedAt().toString());
                    pt.put("temp", m.getTemperature());
                    pt.put("vib_x", m.getVibrationX());
                    pt.put("vib_y", m.getVibrationY());
                    pt.put("vib_z", m.getVibrationZ());
                    pt.put("spindle_load", m.getSpindleLoad());
                    pt.put("power", m.getPowerConsumption());
                    pt.put("cutting_force", m.getCuttingForce());
                    return pt;
                }).collect(Collectors.toList());

        payload.put("time_series", series);
        return payload;
    }
}
