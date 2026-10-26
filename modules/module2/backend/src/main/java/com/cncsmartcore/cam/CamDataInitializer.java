package com.cncsmartcore.cam;

import com.cncsmartcore.cad.CadDataInitializer;
import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.machine.MachineProfileRepository;
import com.cncsmartcore.storage.StorageService;
import com.cncsmartcore.tool.CuttingTool;
import com.cncsmartcore.tool.CuttingToolRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Order(30)
public class CamDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CamDataInitializer.class);

    public static final UUID HAAS_VF2_ID = UUID.fromString("22222222-2222-2222-2222-222222222201");
    public static final UUID TOOL_10MM_ENDMILL_ID = UUID.fromString("33333333-3333-3333-3333-333333333301");
    public static final UUID TOOL_6MM_ENDMILL_ID = UUID.fromString("33333333-3333-3333-3333-333333333302");
    public static final UUID TOOL_50MM_FACEMILL_ID = UUID.fromString("33333333-3333-3333-3333-333333333303");
    public static final UUID DEFAULT_CAM_JOB_ID = UUID.fromString("44444444-4444-4444-4444-444444444401");

    private final MachineProfileRepository machineRepository;
    private final CuttingToolRepository toolRepository;
    private final CamJobRepository camJobRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    public CamDataInitializer(MachineProfileRepository machineRepository,
                              CuttingToolRepository toolRepository,
                              CamJobRepository camJobRepository,
                              StorageService storageService,
                              ObjectMapper objectMapper) {
        this.machineRepository = machineRepository;
        this.toolRepository = toolRepository;
        this.camJobRepository = camJobRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) {
        seedMachines();
        seedTools();
        seedDefaultSimulatedJob();
    }

    private void seedMachines() {
        if (machineRepository.count() > 0) return;
        log.info("Seeding standard machine profiles catalog...");

        List<MachineProfile> machines = List.of(
                new MachineProfile(
                        HAAS_VF2_ID,
                        "Haas VF-2 (3-Axis VMC)",
                        "GENERIC_ISO",
                        762.0, 406.0, 508.0,
                        8100, 22.4, 0.85,
                        25400.0, 16500.0, 4.2,
                        850.0, 1.2, true, true
                ),
                new MachineProfile(
                        UUID.fromString("22222222-2222-2222-2222-222222222202"),
                        "DMG MORI DMU 50 (5-Axis)",
                        "GENERIC_ISO",
                        500.0, 450.0, 400.0,
                        15000, 14.5, 0.88,
                        30000.0, 20000.0, 5.0,
                        1400.0, 1.5, true, true
                ),
                new MachineProfile(
                        UUID.fromString("22222222-2222-2222-2222-222222222203"),
                        "BFW Chakra BMV 45+ (3-Axis VMC)",
                        "GENERIC_ISO",
                        800.0, 450.0, 500.0,
                        8000, 11.0, 0.80,
                        24000.0, 10000.0, 6.0,
                        600.0, 0.9, true, true
                ),
                new MachineProfile(
                        UUID.fromString("22222222-2222-2222-2222-222222222204"),
                        "Generic Desktop CNC Router",
                        "GENERIC_ISO",
                        300.0, 180.0, 80.0,
                        10000, 1.5, 0.75,
                        3000.0, 2000.0, 25.0,
                        250.0, 0.2, true, true
                )
        );

        machineRepository.saveAll(machines);
        log.info("Successfully seeded {} machine profiles.", machines.size());
    }

    private void seedTools() {
        if (toolRepository.count() > 0) return;
        log.info("Seeding standard cutting tools catalog...");

        List<CuttingTool> tools = List.of(
                new CuttingTool(
                        TOOL_10MM_ENDMILL_ID,
                        "10mm 3-Flute Carbide Flat End Mill",
                        "FLAT_END_MILL",
                        10.0, 3, 25.0, 75.0,
                        "CARBIDE", true, 1450.0,
                        120.0, true, true
                ),
                new CuttingTool(
                        TOOL_6MM_ENDMILL_ID,
                        "6mm 4-Flute Carbide Flat End Mill",
                        "FLAT_END_MILL",
                        6.0, 4, 18.0, 50.0,
                        "CARBIDE", true, 950.0,
                        90.0, true, true
                ),
                new CuttingTool(
                        TOOL_50MM_FACEMILL_ID,
                        "50mm 5-Insert Carbide Face Mill",
                        "FACE_MILL",
                        50.0, 5, 12.0, 100.0,
                        "CARBIDE", false, 4800.0,
                        240.0, true, true
                ),
                new CuttingTool(
                        UUID.fromString("33333333-3333-3333-3333-333333333304"),
                        "6mm 2-Flute Carbide Ball End Mill",
                        "BALL_END_MILL",
                        6.0, 2, 15.0, 60.0,
                        "CARBIDE", true, 1100.0,
                        90.0, true, true
                ),
                new CuttingTool(
                        UUID.fromString("33333333-3333-3333-3333-333333333305"),
                        "8.5mm HSS Jobber Twist Drill",
                        "DRILL",
                        8.5, 2, 75.0, 117.0,
                        "HSS", true, 320.0,
                        45.0, true, true
                )
        );

        toolRepository.saveAll(tools);
        log.info("Successfully seeded {} cutting tools.", tools.size());
    }

    private void seedDefaultSimulatedJob() {
        if (camJobRepository.count() > 0) return;
        log.info("Seeding default simulated CAM job for Standard Calibration Cube...");

        try {
            CamJob job = new CamJob(
                    CadDataInitializer.DEMO_CUBE_VERSION_ID,
                    CadDataInitializer.AL6061_MATERIAL_ID,
                    HAAS_VF2_ID,
                    CadDataInitializer.SYSTEM_USER_ID,
                    "CAM Job: Standard Calibration Cube (10mm) (v1)"
            );
            job.setId(DEFAULT_CAM_JOB_ID);
            job.setStatus("TOOLPATH_READY");
            job.setStockAllowanceMm(2.0);
            job.setStockXMm(14.0);
            job.setStockYMm(14.0);
            job.setStockZMm(12.0);
            job.setSetupTimeMin(15.0);

            // Operation 1: Facing
            ToolpathOperation op1 = new ToolpathOperation(
                    1, "FACING", TOOL_50MM_FACEMILL_ID,
                    2500, 1200.0, 360.0, 1.0, 35.0, 0.2, "CATALOG_RECOMMENDED"
            );
            op1.setPathLengthMm(68.0);
            op1.setCuttingLengthMm(52.0);
            op1.setRapidLengthMm(16.0);
            op1.setMoveCount(8);
            op1.setEstTimeS(4.5);
            op1.setEstPowerKw(1.4);
            job.addOperation(op1);

            // Operation 2: Pocket Roughing
            ToolpathOperation op2 = new ToolpathOperation(
                    2, "POCKETING", TOOL_10MM_ENDMILL_ID,
                    4500, 850.0, 250.0, 2.0, 6.0, 0.3, "CATALOG_RECOMMENDED"
            );
            op2.setPathLengthMm(145.0);
            op2.setCuttingLengthMm(120.0);
            op2.setRapidLengthMm(25.0);
            op2.setMoveCount(16);
            op2.setEstTimeS(12.8);
            op2.setEstPowerKw(1.8);
            job.addOperation(op2);

            // Operation 3: Contour Finishing
            ToolpathOperation op3 = new ToolpathOperation(
                    3, "CONTOUR", TOOL_6MM_ENDMILL_ID,
                    6000, 600.0, 180.0, 1.0, 1.5, 0.0, "CATALOG_RECOMMENDED"
            );
            op3.setPathLengthMm(88.0);
            op3.setCuttingLengthMm(80.0);
            op3.setRapidLengthMm(8.0);
            op3.setMoveCount(12);
            op3.setEstTimeS(9.2);
            op3.setEstPowerKw(1.1);
            job.addOperation(op3);

            // Build Physics Estimates JSON
            Map<String, Object> estimates = Map.of(
                    "time", Map.of(
                            "totalMachiningMin", 0.44,
                            "setupMin", 15.0,
                            "totalCycleMin", 15.44
                    ),
                    "materialRemovalRateCm3Min", 22.5,
                    "peakCuttingForceN", 420.0,
                    "estimatedToolWearMin", 185.0,
                    "cost", Map.of(
                            "machineTime", 4.25,
                            "tooling", 1.80,
                            "setup", 25.00,
                            "energy", 0.65,
                            "total", 31.70,
                            "currency", "USD"
                    ),
                    "warnings", List.of(),
                    "calculatedAt", Instant.now().toString()
            );
            job.setEstimates(objectMapper.writeValueAsString(estimates));
            camJobRepository.save(job);

            // Build 3D Toolpath Geometry with Points for Three.js Simulation
            Map<String, Object> toolpathGeometry = buildDefaultToolpathGeometry();
            byte[] toolpathBytes = objectMapper.writeValueAsBytes(toolpathGeometry);
            storageService.storeFile("toolpaths", DEFAULT_CAM_JOB_ID.toString() + "/toolpath.json", toolpathBytes, "application/json");

            // Build Validated Standard ISO G-Code Program
            String gcode = buildDefaultGCode();
            storageService.storeFile("toolpaths", DEFAULT_CAM_JOB_ID.toString() + "/program.nc", gcode.getBytes(StandardCharsets.UTF_8), "text/plain");

            log.info("Successfully seeded default simulated CAM job [{}] with 3D toolpath & G-code.", DEFAULT_CAM_JOB_ID);
        } catch (Exception e) {
            log.error("Failed to seed default simulated CAM job: {}", e.getMessage(), e);
        }
    }

    private Map<String, Object> buildDefaultToolpathGeometry() {
        Map<String, Object> root = new HashMap<>();
        root.put("camJobId", DEFAULT_CAM_JOB_ID.toString());
        root.put("stock", Map.of("x", 14.0, "y", 14.0, "z", 12.0, "safeZ", 5.0));
        root.put("totalPathLengthMm", 301.0);
        root.put("totalCuttingLengthMm", 252.0);
        root.put("totalRapidLengthMm", 49.0);
        root.put("totalMoves", 36);
        root.put("totalCycleTimeS", 26.5);

        List<Map<String, Object>> ops = new ArrayList<>();

        // Op 1 Points (Facing at Z=10.0)
        List<Map<String, Object>> op1Pts = List.of(
                point(0.0, 0.0, 5.0, "RAPID", 15000, 0),
                point(-2.0, -2.0, 5.0, "RAPID", 15000, 0),
                point(-2.0, -2.0, 10.0, "PLUNGE", 360, 2500),
                point(12.0, -2.0, 10.0, "FEED", 1200, 2500),
                point(12.0, 12.0, 10.0, "FEED", 1200, 2500),
                point(-2.0, 12.0, 10.0, "FEED", 1200, 2500),
                point(-2.0, -2.0, 10.0, "FEED", 1200, 2500),
                point(-2.0, -2.0, 5.0, "RAPID", 15000, 0)
        );
        ops.add(buildOperationResult(1, "FACING", TOOL_50MM_FACEMILL_ID.toString(),
                50.0, 2500, 1200.0, 360.0, 1.0, 35.0, 68.0, 52.0, 16.0, 8, 4.5, op1Pts));

        // Op 2 Points (Pocket Roughing at Z=8.0 and Z=6.0)
        List<Map<String, Object>> op2Pts = List.of(
                point(2.0, 2.0, 5.0, "RAPID", 15000, 0),
                point(2.0, 2.0, 8.0, "PLUNGE", 250, 4500),
                point(8.0, 2.0, 8.0, "FEED", 850, 4500),
                point(8.0, 8.0, 8.0, "FEED", 850, 4500),
                point(2.0, 8.0, 8.0, "FEED", 850, 4500),
                point(2.0, 2.0, 8.0, "FEED", 850, 4500),
                point(2.0, 2.0, 6.0, "PLUNGE", 250, 4500),
                point(8.0, 2.0, 6.0, "FEED", 850, 4500),
                point(8.0, 8.0, 6.0, "FEED", 850, 4500),
                point(2.0, 8.0, 6.0, "FEED", 850, 4500),
                point(2.0, 2.0, 6.0, "FEED", 850, 4500),
                point(2.0, 2.0, 5.0, "RAPID", 15000, 0)
        );
        ops.add(buildOperationResult(2, "POCKETING", TOOL_10MM_ENDMILL_ID.toString(),
                10.0, 4500, 850.0, 250.0, 2.0, 6.0, 145.0, 120.0, 25.0, 12, 12.8, op2Pts));

        // Op 3 Points (Contour Perimeter at Z=5.0)
        List<Map<String, Object>> op3Pts = List.of(
                point(0.0, 0.0, 5.0, "RAPID", 15000, 0),
                point(0.0, 0.0, 0.0, "PLUNGE", 180, 6000),
                point(10.0, 0.0, 0.0, "FEED", 600, 6000),
                point(10.0, 10.0, 0.0, "FEED", 600, 6000),
                point(0.0, 10.0, 0.0, "FEED", 600, 6000),
                point(0.0, 0.0, 0.0, "FEED", 600, 6000),
                point(0.0, 0.0, 10.0, "RAPID", 15000, 0)
        );
        ops.add(buildOperationResult(3, "CONTOUR", TOOL_6MM_ENDMILL_ID.toString(),
                6.0, 6000, 600.0, 180.0, 1.0, 1.5, 88.0, 80.0, 8.0, 7, 9.2, op3Pts));

        root.put("operations", ops);
        return root;
    }

    private Map<String, Object> buildOperationResult(
            int seq, String opType, String toolId, double toolDiameterMm,
            int spindleRpm, double feedMmMin, double plungeFeedMmMin,
            double apMm, double aeMm, double pathLengthMm, double cuttingLengthMm,
            double rapidLengthMm, int moveCount, double estTimeS,
            List<Map<String, Object>> points
    ) {
        Map<String, Object> map = new HashMap<>();
        map.put("seq", seq);
        map.put("opType", opType);
        map.put("toolId", toolId);
        map.put("toolDiameterMm", toolDiameterMm);
        map.put("spindleRpm", spindleRpm);
        map.put("feedMmMin", feedMmMin);
        map.put("plungeFeedMmMin", plungeFeedMmMin);
        map.put("apMm", apMm);
        map.put("aeMm", aeMm);
        map.put("pathLengthMm", pathLengthMm);
        map.put("cuttingLengthMm", cuttingLengthMm);
        map.put("rapidLengthMm", rapidLengthMm);
        map.put("moveCount", moveCount);
        map.put("estTimeS", estTimeS);
        map.put("points", points);
        return map;
    }

    private Map<String, Object> point(double x, double y, double z, String moveType, double f, double s) {
        return Map.of("x", x, "y", y, "z", z, "moveType", moveType, "f", f, "s", s);
    }

    private String buildDefaultGCode() {
        return "%\n" +
                "(PROGRAM: CAM Job: Standard Calibration Cube 10mm)\n" +
                "(MACHINE: Haas VF-2 - Dialect: GENERIC_ISO)\n" +
                "(MATERIAL: Aluminium 6061-T6)\n" +
                "(STOCK EXTENTS X: 14.000 Y: 14.000 Z: 12.000)\n" +
                "G21 G90 G17 G40 G49 G80\n\n" +
                "(OPERATION 1: FACING - 50mm Face Mill)\n" +
                "T3 M06\n" +
                "S2500 M03\n" +
                "G00 Z5.000\n" +
                "G00 X-2.000 Y-2.000\n" +
                "G01 Z10.000 F360.0\n" +
                "G01 X12.000 Y-2.000 F1200.0\n" +
                "G01 X12.000 Y12.000\n" +
                "G01 X-2.000 Y12.000\n" +
                "G01 X-2.000 Y-2.000\n" +
                "G00 Z5.000\n\n" +
                "(OPERATION 2: POCKETING - 10mm Flat End Mill)\n" +
                "T1 M06\n" +
                "S4500 M03\n" +
                "G00 X2.000 Y2.000\n" +
                "G01 Z8.000 F250.0\n" +
                "G01 X8.000 Y2.000 F850.0\n" +
                "G01 X8.000 Y8.000\n" +
                "G01 X2.000 Y8.000\n" +
                "G01 X2.000 Y2.000\n" +
                "G01 Z6.000 F250.0\n" +
                "G01 X8.000 Y2.000 F850.0\n" +
                "G01 X8.000 Y8.000\n" +
                "G01 X2.000 Y8.000\n" +
                "G01 X2.000 Y2.000\n" +
                "G00 Z5.000\n\n" +
                "(OPERATION 3: CONTOUR - 6mm Flat End Mill)\n" +
                "T2 M06\n" +
                "S6000 M03\n" +
                "G00 X0.000 Y0.000\n" +
                "G01 Z0.000 F180.0\n" +
                "G01 X10.000 Y0.000 F600.0\n" +
                "G01 X10.000 Y10.000\n" +
                "G01 X0.000 Y10.000\n" +
                "G01 X0.000 Y0.000\n" +
                "G00 Z10.000\n\n" +
                "M05\n" +
                "M30\n" +
                "%\n";
    }
}
