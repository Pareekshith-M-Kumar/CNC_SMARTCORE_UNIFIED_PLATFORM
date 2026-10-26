package com.cncsmartcore.monitoring.dto;

import com.cncsmartcore.monitoring.model.Machine;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineStatusDTO {

    private Long id;
    private String machineCode;
    private String name;
    private String model;
    private String manufacturer;
    private Machine.MachineStatus status;
    private String location;

    // Latest metrics snapshot
    private Double spindleSpeed;
    private Double feedRate;
    private Double spindleLoad;
    private Double temperature;
    private Double vibrationX;
    private Double vibrationY;
    private Double vibrationZ;
    private Double powerConsumption;
    private Double coolantLevel;
    private Double coolantTemperature;

    // Position
    private Double axisPositionX;
    private Double axisPositionY;
    private Double axisPositionZ;

    // Production info
    private String currentJobNumber;
    private String currentPartName;
    private Integer partsProducedToday;
    private Double efficiency;             // %

    // Health indicators
    private Long openAlertCount;
    private Boolean maintenanceDue;
    private LocalDateTime nextMaintenanceDate;
    private LocalDateTime metricsTimestamp;

    // Thresholds exceeded
    private Boolean temperatureWarning;
    private Boolean vibrationWarning;
    private Boolean spindleLoadWarning;
}
