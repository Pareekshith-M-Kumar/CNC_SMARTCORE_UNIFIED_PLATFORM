package com.cncsmartcore.cam;

import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cam.dto.*;
import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.machine.MachineProfileRepository;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.material.MaterialRepository;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.cad.GeometryClient;
import com.cncsmartcore.storage.StorageService;
import com.cncsmartcore.tool.CuttingTool;
import com.cncsmartcore.tool.CuttingToolRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class CamJobService {

    private final CamJobRepository camJobRepository;
    private final ToolpathOperationRepository operationRepository;
    private final CadVersionRepository cadVersionRepository;
    private final MachineProfileRepository machineRepository;
    private final CuttingToolRepository toolRepository;
    private final MaterialRepository materialRepository;
    private final CamParameterCalculator parameterCalculator;
    private final CamEstimator camEstimator;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final GeometryClient geometryClient;
    private final StorageService storageService;

    public CamJobService(
            CamJobRepository camJobRepository,
            ToolpathOperationRepository operationRepository,
            CadVersionRepository cadVersionRepository,
            MachineProfileRepository machineRepository,
            CuttingToolRepository toolRepository,
            MaterialRepository materialRepository,
            CamParameterCalculator parameterCalculator,
            CamEstimator camEstimator,
            AuditService auditService,
            ObjectMapper objectMapper,
            GeometryClient geometryClient,
            StorageService storageService
    ) {
        this.camJobRepository = camJobRepository;
        this.operationRepository = operationRepository;
        this.cadVersionRepository = cadVersionRepository;
        this.machineRepository = machineRepository;
        this.toolRepository = toolRepository;
        this.materialRepository = materialRepository;
        this.parameterCalculator = parameterCalculator;
        this.camEstimator = camEstimator;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.geometryClient = geometryClient;
        this.storageService = storageService;
    }

    @Transactional
    public CamJobResponse createJob(CreateCamJobRequest request, CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(request.cadVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found: " + request.cadVersionId()));

        MachineProfile machine = machineRepository.findById(request.machineId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine profile not found: " + request.machineId()));

        UUID materialId = request.materialId() != null ? request.materialId() : version.getSelectedMaterialId();
        Material material = null;
        if (materialId != null) {
            material = materialRepository.findById(materialId).orElse(null);
        }
        if (material == null) {
            // Pick first active material as fallback
            material = materialRepository.findAllByIsActiveTrue().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Material catalog is empty"));
            materialId = material.getId();
        }

        double allowance = 2.0;
        double partX = version.getBboxXMm() != null ? version.getBboxXMm() : 50.0;
        double partY = version.getBboxYMm() != null ? version.getBboxYMm() : 50.0;
        double partZ = version.getBboxZMm() != null ? version.getBboxZMm() : 25.0;

        double stockX = partX + (2.0 * allowance);
        double stockY = partY + (2.0 * allowance);
        double stockZ = partZ + allowance;

        validateMachineTravel(machine, stockX, stockY, stockZ);

        UUID actorId = currentUser != null ? currentUser.id() : version.getUploadedBy();
        CamJob job = new CamJob(version.getId(), materialId, machine.getId(), actorId, request.name());
        job.setStockAllowanceMm(allowance);
        job.setStockXMm(stockX);
        job.setStockYMm(stockY);
        job.setStockZMm(stockZ);

        // Pre-populate standard sequence of 3 default operations (Facing -> Rough Pocket -> Contour)
        List<CuttingTool> allTools = toolRepository.findAllByIsActiveTrue();
        CuttingTool flatEndMill = allTools.stream()
                .filter(t -> "FLAT_END_MILL".equalsIgnoreCase(t.getToolType()))
                .findFirst()
                .orElse(allTools.isEmpty() ? null : allTools.get(0));

        CuttingTool faceMill = allTools.stream()
                .filter(t -> "FACE_MILL".equalsIgnoreCase(t.getToolType()))
                .findFirst()
                .orElse(flatEndMill);

        if (flatEndMill != null) {
            // Op 1: Face
            CamParameterCalculator.CalculatedParameters p1 = parameterCalculator.calculateOperationParameters(
                    "FACE", material, faceMill != null ? faceMill : flatEndMill, machine, allowance, partZ);
            ToolpathOperation op1 = new ToolpathOperation(
                    1, "FACE", (faceMill != null ? faceMill : flatEndMill).getId(),
                    p1.spindleRpm(), p1.feedMmMin(), p1.plungeFeedMmMin(), p1.apMm(), p1.aeMm(), p1.finishAllowanceMm(), "CALCULATED");
            job.addOperation(op1);

            // Op 2: Rough Pocket
            CamParameterCalculator.CalculatedParameters p2 = parameterCalculator.calculateOperationParameters(
                    "ROUGH_POCKET", material, flatEndMill, machine, allowance, partZ);
            ToolpathOperation op2 = new ToolpathOperation(
                    2, "ROUGH_POCKET", flatEndMill.getId(),
                    p2.spindleRpm(), p2.feedMmMin(), p2.plungeFeedMmMin(), p2.apMm(), p2.aeMm(), p2.finishAllowanceMm(), "CALCULATED");
            job.addOperation(op2);

            // Op 3: Contour
            CamParameterCalculator.CalculatedParameters p3 = parameterCalculator.calculateOperationParameters(
                    "CONTOUR", material, flatEndMill, machine, allowance, partZ);
            ToolpathOperation op3 = new ToolpathOperation(
                    3, "CONTOUR", flatEndMill.getId(),
                    p3.spindleRpm(), p3.feedMmMin(), p3.plungeFeedMmMin(), p3.apMm(), p3.aeMm(), p3.finishAllowanceMm(), "CALCULATED");
            job.addOperation(op3);
        }

        // Calculate initial estimates
        Map<UUID, CuttingTool> toolMap = new HashMap<>();
        for (CuttingTool t : allTools) {
            toolMap.put(t.getId(), t);
        }
        CamEstimatesResponse estimates = camEstimator.calculateEstimates(
                stockX, stockY, stockZ, allowance, job.getSetupTimeMin(), version.getVolumeMm3(),
                material, machine, job.getOperations(), toolMap
        );

        try {
            job.setEstimates(objectMapper.writeValueAsString(estimates));
        } catch (JsonProcessingException ignored) {}

        job.setConfigHash(computeConfigHash(job));
        job = camJobRepository.save(job);

        String actorRole = currentUser != null ? currentUser.role() : "cam_engineer";
        auditService.logEvent(actorId, actorRole, "CAM_JOB_CREATED", "CAM_JOB", job.getId(),
                Map.of("name", job.getName(), "machine", machine.getName()), null);

        return CamJobResponse.from(job, objectMapper);
    }

    @Transactional(readOnly = true)
    public CamJobResponse getJob(UUID jobId, CurrentUser currentUser) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));
        return CamJobResponse.from(job, objectMapper);
    }

    @Transactional(readOnly = true)
    public List<CamJobResponse> listJobs(UUID cadVersionId, CurrentUser currentUser) {
        List<CamJob> jobs;
        if (cadVersionId != null) {
            jobs = camJobRepository.findAllByCadVersionIdOrderByCreatedAtDesc(cadVersionId);
        } else {
            jobs = camJobRepository.findAllByOrderByCreatedAtDesc();
        }
        return jobs.stream().map(j -> CamJobResponse.from(j, objectMapper)).toList();
    }

    @Transactional
    public CamJobResponse configureJob(UUID jobId, ConfigureCamJobRequest request, CurrentUser currentUser) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));

        if ("SUBMITTED".equals(job.getStatus()) || "APPROVED".equals(job.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot modify a job that is already " + job.getStatus());
        }

        CadVersion version = cadVersionRepository.findById(job.getCadVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated CAD version not found"));

        MachineProfile machine = machineRepository.findById(job.getMachineId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine profile not found"));

        Material material = materialRepository.findById(job.getMaterialId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));

        double allowance = request.stockAllowanceMm();
        double partX = version.getBboxXMm() != null ? version.getBboxXMm() : 50.0;
        double partY = version.getBboxYMm() != null ? version.getBboxYMm() : 50.0;
        double partZ = version.getBboxZMm() != null ? version.getBboxZMm() : 25.0;

        double stockX = partX + (2.0 * allowance);
        double stockY = partY + (2.0 * allowance);
        double stockZ = partZ + allowance;

        validateMachineTravel(machine, stockX, stockY, stockZ);

        job.setStockAllowanceMm(allowance);
        job.setStockXMm(stockX);
        job.setStockYMm(stockY);
        job.setStockZMm(stockZ);
        job.setSetupTimeMin(request.setupTimeMin());

        // Replace operations
        job.clearOperations();
        operationRepository.deleteAll(operationRepository.findAllByCamJobIdOrderBySeqAsc(job.getId()));

        List<CuttingTool> allTools = toolRepository.findAllByIsActiveTrue();
        Map<UUID, CuttingTool> toolMap = new HashMap<>();
        for (CuttingTool t : allTools) {
            toolMap.put(t.getId(), t);
        }

        int seq = 1;
        for (OperationConfigRequest opReq : request.operations()) {
            CuttingTool tool = toolMap.get(opReq.toolId());
            if (tool == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tool ID in operation #" + seq + ": " + opReq.toolId());
            }

            // Validate RPM & Feed within machine constraints
            if (opReq.spindleRpm() > machine.getMaxRpm()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                        "Op #%d: Spindle RPM (%d) exceeds machine max RPM (%d)",
                        seq, opReq.spindleRpm(), machine.getMaxRpm()));
            }
            if (opReq.feedMmMin() > machine.getMaxFeedMmMin()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                        "Op #%d: Feed rate (%.1f mm/min) exceeds machine max feed (%.1f mm/min)",
                        seq, opReq.feedMmMin(), machine.getMaxFeedMmMin()));
            }

            ToolpathOperation op = new ToolpathOperation(
                    seq++,
                    opReq.opType(),
                    opReq.toolId(),
                    opReq.spindleRpm(),
                    opReq.feedMmMin(),
                    opReq.plungeFeedMmMin() != null ? opReq.plungeFeedMmMin() : Math.round(opReq.feedMmMin() * 0.3),
                    opReq.apMm(),
                    opReq.aeMm(),
                    opReq.finishAllowanceMm() != null ? opReq.finishAllowanceMm() : 0.3,
                    opReq.parametersSource() != null ? opReq.parametersSource() : "EDITED"
            );
            job.addOperation(op);
        }

        // Recalculate Estimates
        CamEstimatesResponse estimates = camEstimator.calculateEstimates(
                stockX, stockY, stockZ, allowance, job.getSetupTimeMin(), version.getVolumeMm3(),
                material, machine, job.getOperations(), toolMap
        );

        try {
            job.setEstimates(objectMapper.writeValueAsString(estimates));
        } catch (JsonProcessingException ignored) {}

        job.setStatus("CONFIGURED");
        job.setConfigHash(computeConfigHash(job));
        job.setUpdatedAt(Instant.now());
        job = camJobRepository.save(job);

        UUID actorId = currentUser != null ? currentUser.id() : job.getCreatedBy();
        String actorRole = currentUser != null ? currentUser.role() : "cam_engineer";
        auditService.logEvent(actorId, actorRole, "CAM_JOB_CONFIGURED", "CAM_JOB", job.getId(),
                Map.of("name", job.getName(), "operationCount", job.getOperations().size()), null);

        return CamJobResponse.from(job, objectMapper);
    }

    public CamEstimatesResponse calculateSandbox(UUID jobId, ConfigureCamJobRequest request) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));

        CadVersion version = cadVersionRepository.findById(job.getCadVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated CAD version not found"));

        MachineProfile machine = machineRepository.findById(job.getMachineId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine profile not found"));

        Material material = materialRepository.findById(job.getMaterialId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));

        double allowance = request.stockAllowanceMm();
        double partX = version.getBboxXMm() != null ? version.getBboxXMm() : 50.0;
        double partY = version.getBboxYMm() != null ? version.getBboxYMm() : 50.0;
        double partZ = version.getBboxZMm() != null ? version.getBboxZMm() : 25.0;

        double stockX = partX + (2.0 * allowance);
        double stockY = partY + (2.0 * allowance);
        double stockZ = partZ + allowance;

        validateMachineTravel(machine, stockX, stockY, stockZ);

        List<CuttingTool> allTools = toolRepository.findAllByIsActiveTrue();
        Map<UUID, CuttingTool> toolMap = new HashMap<>();
        for (CuttingTool t : allTools) {
            toolMap.put(t.getId(), t);
        }

        List<ToolpathOperation> tempOps = new ArrayList<>();
        int seq = 1;
        for (OperationConfigRequest opReq : request.operations()) {
            tempOps.add(new ToolpathOperation(
                    seq++, opReq.opType(), opReq.toolId(), opReq.spindleRpm(),
                    opReq.feedMmMin(), opReq.plungeFeedMmMin() != null ? opReq.plungeFeedMmMin() : opReq.feedMmMin() * 0.3,
                    opReq.apMm(), opReq.aeMm(), opReq.finishAllowanceMm() != null ? opReq.finishAllowanceMm() : 0.3,
                    opReq.parametersSource()
            ));
        }

        return camEstimator.calculateEstimates(
                stockX, stockY, stockZ, allowance, request.setupTimeMin(), version.getVolumeMm3(),
                material, machine, tempOps, toolMap
        );
    }

    private void validateMachineTravel(MachineProfile machine, double stockX, double stockY, double stockZ) {
        if (stockX > machine.getTravelXMm()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                    "Part envelope with stock allowance (X: %.1f mm) exceeds machine travel limit (X: %.1f mm)",
                    stockX, machine.getTravelXMm()));
        }
        if (stockY > machine.getTravelYMm()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                    "Part envelope with stock allowance (Y: %.1f mm) exceeds machine travel limit (Y: %.1f mm)",
                    stockY, machine.getTravelYMm()));
        }
        if (stockZ > machine.getTravelZMm()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                    "Part envelope with stock allowance (Z: %.1f mm) exceeds machine travel limit (Z: %.1f mm)",
                    stockZ, machine.getTravelZMm()));
        }
    }

    private String computeConfigHash(CamJob job) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            StringBuilder sb = new StringBuilder();
            sb.append(job.getCadVersionId()).append(";")
                    .append(job.getMaterialId()).append(";")
                    .append(job.getMachineId()).append(";")
                    .append(job.getStockAllowanceMm()).append(";")
                    .append(job.getSetupTimeMin()).append(";");

            for (ToolpathOperation op : job.getOperations()) {
                sb.append(op.getSeq()).append(":")
                        .append(op.getOpType()).append(":")
                        .append(op.getToolId()).append(":")
                        .append(op.getSpindleRpm()).append(":")
                        .append(op.getFeedMmMin()).append(":")
                        .append(op.getApMm()).append(":")
                        .append(op.getAeMm()).append(";");
            }
            byte[] hash = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    @Transactional
    public CamJobResponse generateToolpathAndGCode(UUID jobId, CurrentUser currentUser) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));

        if ("SUBMITTED".equals(job.getStatus()) || "APPROVED".equals(job.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot generate toolpath for a job that is already " + job.getStatus());
        }

        if (job.getOperations().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot generate toolpath: no operations configured");
        }

        CadVersion version = cadVersionRepository.findById(job.getCadVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated CAD version not found"));

        MachineProfile machine = machineRepository.findById(job.getMachineId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine profile not found"));

        List<CuttingTool> allTools = toolRepository.findAllByIsActiveTrue();
        Map<UUID, CuttingTool> toolMap = new HashMap<>();
        for (CuttingTool t : allTools) {
            toolMap.put(t.getId(), t);
        }

        List<Map<String, Object>> opRequests = new ArrayList<>();
        for (ToolpathOperation op : job.getOperations()) {
            CuttingTool tool = toolMap.get(op.getToolId());
            Map<String, Object> opMap = new HashMap<>();
            opMap.put("seq", op.getSeq());
            opMap.put("opType", op.getOpType());
            opMap.put("toolId", op.getToolId().toString());
            opMap.put("toolDiameterMm", tool != null ? tool.getDiameterMm() : 10.0);
            opMap.put("toolFluteLengthMm", tool != null ? tool.getFluteLengthMm() : 25.0);
            opMap.put("spindleRpm", (double) op.getSpindleRpm());
            opMap.put("feedMmMin", op.getFeedMmMin());
            opMap.put("plungeFeedMmMin", op.getPlungeFeedMmMin());
            opMap.put("apMm", op.getApMm());
            opMap.put("aeMm", op.getAeMm());
            opMap.put("finishAllowanceMm", op.getFinishAllowanceMm());
            opRequests.add(opMap);
        }

        Map<String, Object> toolpathPayload = new HashMap<>();
        toolpathPayload.put("camJobId", job.getId().toString());
        toolpathPayload.put("partBboxX", version.getBboxXMm() != null ? version.getBboxXMm() : 50.0);
        toolpathPayload.put("partBboxY", version.getBboxYMm() != null ? version.getBboxYMm() : 50.0);
        toolpathPayload.put("partBboxZ", version.getBboxZMm() != null ? version.getBboxZMm() : 25.0);
        toolpathPayload.put("stockX", job.getStockXMm());
        toolpathPayload.put("stockY", job.getStockYMm());
        toolpathPayload.put("stockZ", job.getStockZMm());
        toolpathPayload.put("safeHeightZ", 5.0);
        toolpathPayload.put("rapidFeedMmMin", machine.getRapidFeedMmMin() > 0 ? machine.getRapidFeedMmMin() : 15000.0);
        toolpathPayload.put("operations", opRequests);

        Map<String, Object> toolpathResponse;
        try {
            toolpathResponse = geometryClient.generateToolpath(toolpathPayload);
        } catch (Exception ex) {
            job.setStatus("TOOLPATH_FAILED");
            job.setLastError("Toolpath calculation failed: " + ex.getMessage());
            job.setGenerationAttempts(job.getGenerationAttempts() + 1);
            job.setUpdatedAt(Instant.now());
            camJobRepository.save(job);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Toolpath generation failed: " + ex.getMessage(), ex);
        }

        // Update operations with generated geometric lengths and timing
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> resOps = (List<Map<String, Object>>) toolpathResponse.get("operations");
        if (resOps != null) {
            for (Map<String, Object> resOp : resOps) {
                int seq = ((Number) resOp.get("seq")).intValue();
                job.getOperations().stream().filter(o -> o.getSeq() == seq).findFirst().ifPresent(op -> {
                    if (resOp.get("pathLengthMm") != null) op.setPathLengthMm(((Number) resOp.get("pathLengthMm")).doubleValue());
                    if (resOp.get("cuttingLengthMm") != null) op.setCuttingLengthMm(((Number) resOp.get("cuttingLengthMm")).doubleValue());
                    if (resOp.get("rapidLengthMm") != null) op.setRapidLengthMm(((Number) resOp.get("rapidLengthMm")).doubleValue());
                    if (resOp.get("moveCount") != null) op.setMoveCount(((Number) resOp.get("moveCount")).intValue());
                    if (resOp.get("estTimeS") != null) op.setEstTimeS(((Number) resOp.get("estTimeS")).doubleValue());
                });
            }
        }

        // Store toolpath JSON in storage bucket "toolpaths"
        try {
            byte[] toolpathBytes = objectMapper.writeValueAsBytes(toolpathResponse);
            storageService.storeFile("toolpaths", job.getId().toString() + "/toolpath.json", toolpathBytes, "application/json");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to persist toolpath JSON: " + e.getMessage());
        }

        // Now post-process & validate G-code
        String dialect = "HAAS";
        if (machine.getControllerDialect() != null) {
            String raw = machine.getControllerDialect().trim().toUpperCase();
            if (raw.contains("FANUC")) dialect = "FANUC";
            else if (raw.contains("GRBL")) dialect = "GRBL";
            else if (raw.contains("SIEMENS")) dialect = "SIEMENS";
            else dialect = "HAAS";
        }

        Map<String, Object> gcodePayload = new HashMap<>();
        gcodePayload.put("camJobId", job.getId().toString());
        gcodePayload.put("jobName", job.getName());
        gcodePayload.put("machineName", machine.getName());
        gcodePayload.put("controllerDialect", dialect);
        gcodePayload.put("maxRpm", (double) machine.getMaxRpm());
        gcodePayload.put("travelXMm", machine.getTravelXMm());
        gcodePayload.put("travelYMm", machine.getTravelYMm());
        gcodePayload.put("travelZMm", machine.getTravelZMm());
        gcodePayload.put("toolpath", toolpathResponse);

        Map<String, Object> gcodeResult;
        try {
            gcodeResult = geometryClient.validateGCode(gcodePayload);
        } catch (Exception ex) {
            job.setStatus("TOOLPATH_FAILED");
            job.setLastError("G-Code post-processor/validation error: " + ex.getMessage());
            job.setGenerationAttempts(job.getGenerationAttempts() + 1);
            job.setUpdatedAt(Instant.now());
            camJobRepository.save(job);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "G-Code validation call failed: " + ex.getMessage(), ex);
        }

        Boolean isValid = (Boolean) gcodeResult.get("valid");
        String gcodeText = (String) gcodeResult.get("gcodeText");
        @SuppressWarnings("unchecked")
        List<String> errors = (List<String>) gcodeResult.get("errors");

        job.setGenerationAttempts(job.getGenerationAttempts() + 1);
        job.setUpdatedAt(Instant.now());

        UUID actorId = currentUser != null ? currentUser.id() : job.getCreatedBy();
        String actorRole = currentUser != null ? currentUser.role() : "cam_engineer";

        if (Boolean.TRUE.equals(isValid) && gcodeText != null) {
            storageService.storeFile("toolpaths", job.getId().toString() + "/program.nc", gcodeText.getBytes(StandardCharsets.UTF_8), "text/plain");
            job.setStatus("TOOLPATH_READY");
            job.setLastError(null);
            auditService.logEvent(actorId, actorRole, "TOOLPATH_GENERATED", "CAM_JOB", job.getId(),
                    Map.of("dialect", dialect, "operations", job.getOperations().size()), null);
        } else {
            job.setStatus("TOOLPATH_FAILED");
            String errSummary = (errors != null && !errors.isEmpty()) ? String.join("; ", errors) : "G-code validation rejected invalid toolpath";
            job.setLastError(errSummary);
            auditService.logEvent(actorId, actorRole, "TOOLPATH_FAILED", "CAM_JOB", job.getId(),
                    Map.of("reason", errSummary), null);
        }

        job = camJobRepository.save(job);
        return CamJobResponse.from(job, objectMapper);
    }

    @Transactional(readOnly = true)
    public byte[] getToolpathData(UUID jobId) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));

        byte[] data = storageService.loadFile("toolpaths", job.getId().toString() + "/toolpath.json");
        if (data == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Toolpath geometry data not generated yet for job: " + jobId);
        }
        return data;
    }

    @Transactional(readOnly = true)
    public String getGCode(UUID jobId) {
        CamJob job = camJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM job not found: " + jobId));

        if (!"TOOLPATH_READY".equals(job.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "G-Code download is disabled until toolpath is generated and validation passes");
        }

        byte[] data = storageService.loadFile("toolpaths", job.getId().toString() + "/program.nc");
        if (data == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "G-Code program not found for job: " + jobId);
        }
        return new String(data, StandardCharsets.UTF_8);
    }
}
