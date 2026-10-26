package com.cncsmartcore.cam;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "toolpath_operations")
public class ToolpathOperation {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cam_job_id", nullable = false)
    @JsonIgnore
    private CamJob camJob;

    @Column(nullable = false)
    private int seq;

    @Column(name = "op_type", nullable = false)
    private String opType; // FACE, ROUGH_POCKET, CONTOUR, DRILL

    @Column(name = "tool_id", nullable = false)
    private UUID toolId;

    @Column(name = "spindle_rpm", nullable = false)
    private int spindleRpm;

    @Column(name = "feed_mm_min", nullable = false)
    private double feedMmMin;

    @Column(name = "plunge_feed_mm_min", nullable = false)
    private double plungeFeedMmMin;

    @Column(name = "ap_mm", nullable = false)
    private double apMm;

    @Column(name = "ae_mm", nullable = false)
    private double aeMm;

    @Column(name = "finish_allowance_mm", nullable = false)
    private double finishAllowanceMm = 0.3;

    @Column(name = "parameters_source", nullable = false)
    private String parametersSource = "CALCULATED"; // CALCULATED, EDITED

    @Column(name = "path_length_mm")
    private Double pathLengthMm;

    @Column(name = "cutting_length_mm")
    private Double cuttingLengthMm;

    @Column(name = "rapid_length_mm")
    private Double rapidLengthMm;

    @Column(name = "move_count")
    private Integer moveCount;

    @Column(name = "est_time_s")
    private Double estTimeS;

    @Column(name = "est_power_kw")
    private Double estPowerKw;

    public ToolpathOperation() {}

    public ToolpathOperation(int seq, String opType, UUID toolId, int spindleRpm,
                             double feedMmMin, double plungeFeedMmMin, double apMm,
                             double aeMm, double finishAllowanceMm, String parametersSource) {
        this.id = UUID.randomUUID();
        this.seq = seq;
        this.opType = opType;
        this.toolId = toolId;
        this.spindleRpm = spindleRpm;
        this.feedMmMin = feedMmMin;
        this.plungeFeedMmMin = plungeFeedMmMin;
        this.apMm = apMm;
        this.aeMm = aeMm;
        this.finishAllowanceMm = finishAllowanceMm;
        this.parametersSource = parametersSource != null ? parametersSource : "CALCULATED";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public CamJob getCamJob() { return camJob; }
    public void setCamJob(CamJob camJob) { this.camJob = camJob; }

    public int getSeq() { return seq; }
    public void setSeq(int seq) { this.seq = seq; }

    public String getOpType() { return opType; }
    public void setOpType(String opType) { this.opType = opType; }

    public UUID getToolId() { return toolId; }
    public void setToolId(UUID toolId) { this.toolId = toolId; }

    public int getSpindleRpm() { return spindleRpm; }
    public void setSpindleRpm(int spindleRpm) { this.spindleRpm = spindleRpm; }

    public double getFeedMmMin() { return feedMmMin; }
    public void setFeedMmMin(double feedMmMin) { this.feedMmMin = feedMmMin; }

    public double getPlungeFeedMmMin() { return plungeFeedMmMin; }
    public void setPlungeFeedMmMin(double plungeFeedMmMin) { this.plungeFeedMmMin = plungeFeedMmMin; }

    public double getApMm() { return apMm; }
    public void setApMm(double apMm) { this.apMm = apMm; }

    public double getAeMm() { return aeMm; }
    public void setAeMm(double aeMm) { this.aeMm = aeMm; }

    public double getFinishAllowanceMm() { return finishAllowanceMm; }
    public void setFinishAllowanceMm(double finishAllowanceMm) { this.finishAllowanceMm = finishAllowanceMm; }

    public String getParametersSource() { return parametersSource; }
    public void setParametersSource(String parametersSource) { this.parametersSource = parametersSource; }

    public Double getPathLengthMm() { return pathLengthMm; }
    public void setPathLengthMm(Double pathLengthMm) { this.pathLengthMm = pathLengthMm; }

    public Double getCuttingLengthMm() { return cuttingLengthMm; }
    public void setCuttingLengthMm(Double cuttingLengthMm) { this.cuttingLengthMm = cuttingLengthMm; }

    public Double getRapidLengthMm() { return rapidLengthMm; }
    public void setRapidLengthMm(Double rapidLengthMm) { this.rapidLengthMm = rapidLengthMm; }

    public Integer getMoveCount() { return moveCount; }
    public void setMoveCount(Integer moveCount) { this.moveCount = moveCount; }

    public Double getEstTimeS() { return estTimeS; }
    public void setEstTimeS(Double estTimeS) { this.estTimeS = estTimeS; }

    public Double getEstPowerKw() { return estPowerKw; }
    public void setEstPowerKw(Double estPowerKw) { this.estPowerKw = estPowerKw; }
}
