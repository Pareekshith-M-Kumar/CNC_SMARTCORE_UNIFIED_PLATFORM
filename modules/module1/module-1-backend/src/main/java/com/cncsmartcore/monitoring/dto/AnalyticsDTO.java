package com.cncsmartcore.monitoring.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsDTO {

    // Fleet summary
    private Integer totalMachines;
    private Integer runningMachines;
    private Integer idleMachines;
    private Integer machinesInMaintenance;
    private Integer machinesTotalErrors;
    private Double overallEquipmentEffectiveness; // OEE %

    // Production KPIs
    private Long totalPartsProduced;
    private Long totalJobsCompleted;
    private Long totalJobsPending;
    private Double averageCycleTime;
    private Double onTimeDeliveryRate;            // %

    // Alerts summary
    private Long openAlerts;
    private Long criticalAlerts;

    // Tools
    private Long toolsNeedingReplacement;
    private Double averageToolWear;

    // Time range
    private LocalDateTime from;
    private LocalDateTime to;

    // Machine-level analytics
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MachineAnalytics {
        private Long machineId;
        private String machineCode;
        private String machineName;
        private Double availability;           // %
        private Double performance;            // %
        private Double quality;                // %
        private Double oee;                    // % = A * P * Q
        private Long partsProduced;
        private Double avgCycleTime;
        private Double totalPowerConsumed;     // kWh
        private Long alertCount;
        private List<MetricTrend> temperatureTrend;
        private List<MetricTrend> spindleLoadTrend;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MetricTrend {
        private LocalDateTime timestamp;
        private Double value;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AlertFrequency {
        private String alertType;
        private Long count;
        private Double percentage;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductionTrend {
        private String period;                 // e.g., "2024-W12" or "2024-03"
        private Long partsProduced;
        private Long jobsCompleted;
        private Double avgOee;
    }
}
