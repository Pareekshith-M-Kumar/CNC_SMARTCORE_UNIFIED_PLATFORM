package com.cncsmartcore.monitoring.controller;

import com.cncsmartcore.monitoring.dto.AnalyticsDTO;
import com.cncsmartcore.monitoring.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * GET /api/v1/analytics/fleet?from=...&to=...
     * Returns fleet-level KPIs: OEE, machine counts, alert counts, tool health.
     */
    @GetMapping("/fleet")
    public ResponseEntity<AnalyticsDTO> getFleetSummary(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime effectiveFrom = from != null ? from : LocalDateTime.now().minusDays(7);
        LocalDateTime effectiveTo   = to   != null ? to   : LocalDateTime.now();

        return ResponseEntity.ok(analyticsService.getFleetSummary(effectiveFrom, effectiveTo));
    }

    /**
     * GET /api/v1/analytics/machines/{machineId}?from=...&to=...
     * Returns per-machine OEE breakdown, metric trends, alert frequency.
     */
    @GetMapping("/machines/{machineId}")
    public ResponseEntity<AnalyticsDTO.MachineAnalytics> getMachineAnalytics(
            @PathVariable Long machineId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime effectiveFrom = from != null ? from : LocalDateTime.now().minusDays(7);
        LocalDateTime effectiveTo   = to   != null ? to   : LocalDateTime.now();

        return ResponseEntity.ok(
                analyticsService.getMachineAnalytics(machineId, effectiveFrom, effectiveTo));
    }

    /**
     * GET /api/v1/analytics/machines/{machineId}/alerts?since=...
     * Returns alert frequency breakdown by type for a machine.
     */
    @GetMapping("/machines/{machineId}/alerts")
    public ResponseEntity<List<AnalyticsDTO.AlertFrequency>> getAlertFrequency(
            @PathVariable Long machineId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {

        LocalDateTime effectiveSince = since != null ? since : LocalDateTime.now().minusDays(30);
        return ResponseEntity.ok(analyticsService.getAlertFrequency(machineId, effectiveSince));
    }
}
