package com.cncsmartcore.simulation;

import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.cad.GeometryClient;
import com.cncsmartcore.cam.CamJob;
import com.cncsmartcore.cam.CamJobRepository;
import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.machine.MachineProfileRepository;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.material.MaterialRepository;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.simulation.dto.SimulationResponse;
import com.cncsmartcore.storage.StorageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private final SimulationRepository simulationRepository;
    private final SimulationFindingRepository findingRepository;
    private final CamJobRepository camJobRepository;
    private final MachineProfileRepository machineRepository;
    private final MaterialRepository materialRepository;
    private final GeometryClient geometryClient;
    private final StorageService storageService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public SimulationService(
            SimulationRepository simulationRepository,
            SimulationFindingRepository findingRepository,
            CamJobRepository camJobRepository,
            MachineProfileRepository machineRepository,
            MaterialRepository materialRepository,
            GeometryClient geometryClient,
            StorageService storageService,
            AuditService auditService,
            ObjectMapper objectMapper
    ) {
        this.simulationRepository = simulationRepository;
        this.findingRepository = findingRepository;
        this.camJobRepository = camJobRepository;
        this.machineRepository = machineRepository;
        this.materialRepository = materialRepository;
        this.geometryClient = geometryClient;
        this.storageService = storageService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SimulationResponse runSimulation(UUID camJobId, CurrentUser currentUser) {
        CamJob job = camJobRepository.findById(camJobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM Job not found: " + camJobId));

        // Load generated toolpath
        byte[] toolpathBytes = storageService.loadFile("toolpaths", job.getId().toString() + "/toolpath.json");
        if (toolpathBytes == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Toolpath geometry has not been generated for this CAM job yet. Please generate toolpaths first.");
        }

        Map<String, Object> toolpathData;
        try {
            toolpathData = objectMapper.readValue(toolpathBytes, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse toolpath geometry data: " + ex.getMessage());
        }

        // Machine limits
        double travelX = 762.0;
        double travelY = 508.0;
        double travelZ = 508.0;
        double maxRpm = 8100.0;
        double ratedPowerKw = 22.4;

        if (job.getMachineId() != null) {
            Optional<MachineProfile> machineOpt = machineRepository.findById(job.getMachineId());
            if (machineOpt.isPresent()) {
                MachineProfile m = machineOpt.get();
                travelX = m.getTravelXMm();
                travelY = m.getTravelYMm();
                travelZ = m.getTravelZMm();
                maxRpm = m.getMaxRpm();
                ratedPowerKw = m.getRatedPowerKw();
            }
        }

        // Material specific cutting force kc
        double materialKc = 700.0; // default aluminum
        if (job.getMaterialId() != null) {
            Optional<Material> matOpt = materialRepository.findById(job.getMaterialId());
            if (matOpt.isPresent()) {
                Material mat = matOpt.get();
                String name = (mat.getName() + " " + mat.getCategory()).toLowerCase();
                if (name.contains("steel") || name.contains("titanium") || name.contains("inconel")) {
                    materialKc = 2200.0;
                } else if (name.contains("brass") || name.contains("bronze")) {
                    materialKc = 900.0;
                } else if (name.contains("plastic") || name.contains("delrin") || name.contains("acrylic")) {
                    materialKc = 350.0;
                } else {
                    materialKc = 700.0;
                }
            }
        }

        // Prepare simulation request payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("camJobId", job.getId().toString());
        payload.put("toolpath", toolpathData);
        payload.put("travelXMm", travelX);
        payload.put("travelYMm", travelY);
        payload.put("travelZMm", travelZ);
        payload.put("maxRpm", maxRpm);
        payload.put("ratedPowerKw", ratedPowerKw);
        payload.put("stockX", job.getStockXMm() != null ? job.getStockXMm() : 100.0);
        payload.put("stockY", job.getStockYMm() != null ? job.getStockYMm() : 100.0);
        payload.put("stockZ", job.getStockZMm() != null ? job.getStockZMm() : 25.0);
        payload.put("materialKcNMm2", materialKc);
        payload.put("rulesetVersion", "sim-1.0");

        // Call FastAPI geometry service
        Map<String, Object> simResult = geometryClient.analyzeSimulation(payload);

        String overallResult = (String) simResult.getOrDefault("overallResult", "PASS");
        String rulesetVersion = (String) simResult.getOrDefault("rulesetVersion", "sim-1.0");
        Object statsObj = simResult.get("stats");
        String statsJson = "";
        try {
            statsJson = objectMapper.writeValueAsString(statsObj);
        } catch (Exception ignored) {}

        UUID runBy = currentUser != null ? currentUser.id() : job.getCreatedBy();
        String actorRole = currentUser != null ? currentUser.role() : "cam_engineer";

        // Instantiate Simulation entity
        Simulation simulation = new Simulation(job.getId(), runBy, overallResult, statsJson, rulesetVersion);

        // Populate Simulation findings
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> findingsRaw = (List<Map<String, Object>>) simResult.get("findings");
        if (findingsRaw != null) {
            for (Map<String, Object> fRaw : findingsRaw) {
                String ruleCode = (String) fRaw.get("ruleCode");
                String severity = (String) fRaw.get("severity");
                String message = (String) fRaw.get("message");
                Integer moveIndex = fRaw.get("moveIndex") != null ? ((Number) fRaw.get("moveIndex")).intValue() : null;
                Double x = fRaw.get("xMm") != null ? ((Number) fRaw.get("xMm")).doubleValue() : null;
                Double y = fRaw.get("yMm") != null ? ((Number) fRaw.get("yMm")).doubleValue() : null;
                Double z = fRaw.get("zMm") != null ? ((Number) fRaw.get("zMm")).doubleValue() : null;

                SimulationFinding finding = new SimulationFinding(simulation, ruleCode, severity, message, moveIndex, x, y, z);
                simulation.addFinding(finding);
            }
        }

        simulation = simulationRepository.save(simulation);

        // AC-31 Gate: If any finding is FAIL, overallResult is FAIL and submission is blocked
        if ("FAIL".equals(overallResult)) {
            job.setLastError("Simulation check failed: One or more critical safety rules were violated (FAIL). Plan submission is blocked.");
        } else {
            job.setStatus("SIMULATED");
            job.setLastError(null);
        }
        job.setUpdatedAt(Instant.now());
        camJobRepository.save(job);

        // Audit Event
        auditService.logEvent(
                runBy,
                actorRole,
                "SIMULATION_RUN",
                "CAM_JOB",
                job.getId(),
                Map.of(
                        "overallResult", overallResult,
                        "findingsCount", (findingsRaw != null ? findingsRaw.size() : 0),
                        "rulesetVersion", rulesetVersion
                ),
                null
        );

        return SimulationResponse.from(simulation, objectMapper);
    }

    @Transactional(readOnly = true)
    public SimulationResponse getLatestSimulation(UUID camJobId) {
        Simulation sim = simulationRepository.findFirstByCamJobIdOrderByCreatedAtDesc(camJobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No simulation found for CAM job: " + camJobId));
        return SimulationResponse.from(sim, objectMapper);
    }

    @Transactional(readOnly = true)
    public SimulationResponse getSimulationById(UUID id) {
        Simulation sim = simulationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Simulation not found: " + id));
        return SimulationResponse.from(sim, objectMapper);
    }
}
