package com.cncsmartcore.cad;

import com.cncsmartcore.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.UUID;

@Component
@Order(20)
public class CadDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CadDataInitializer.class);

    public static final UUID DEMO_CUBE_ASSET_ID = UUID.fromString("11111111-1111-1111-1111-111111111101");
    public static final UUID DEMO_CUBE_VERSION_ID = UUID.fromString("11111111-1111-1111-1111-111111111102");

    public static final UUID DEMO_BRACKET_ASSET_ID = UUID.fromString("11111111-1111-1111-1111-111111111103");
    public static final UUID DEMO_BRACKET_VERSION_ID = UUID.fromString("11111111-1111-1111-1111-111111111104");

    public static final UUID SYSTEM_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final UUID AL6061_MATERIAL_ID = UUID.fromString("11111111-1111-1111-1111-111111111101");

    private final CadAssetRepository cadAssetRepository;
    private final StorageService storageService;

    public CadDataInitializer(CadAssetRepository cadAssetRepository, StorageService storageService) {
        this.cadAssetRepository = cadAssetRepository;
        this.storageService = storageService;
    }

    @Override
    public void run(String... args) {
        if (cadAssetRepository.count() > 0) {
            log.info("CAD assets catalog already contains {} items.", cadAssetRepository.count());
            return;
        }

        log.info("Seeding baseline CAD engineering models catalog...");
        seedCalibrationCube();
        seedAircraftBracket();
        log.info("Successfully seeded standard CAD models catalog.");
    }

    private void seedCalibrationCube() {
        try {
            byte[] fileBytes = loadFixture("cube_10mm.stl");
            String sha256 = computeSha256(fileBytes);

            CadAsset asset = new CadAsset(SYSTEM_USER_ID, "Standard Calibration Cube (10mm)",
                    "Baseline calibration fixture cube for machining and kinematics verification.");
            asset.setId(DEMO_CUBE_ASSET_ID);

            String storagePath = storageService.buildOriginalPath(DEMO_CUBE_ASSET_ID, DEMO_CUBE_VERSION_ID, "cube_10mm.stl");
            storageService.storeFile("cad-originals", storagePath, fileBytes, "application/sla");

            CadVersion version = new CadVersion(
                    asset,
                    1,
                    "cube_10mm.stl",
                    "STL",
                    fileBytes.length,
                    sha256,
                    "cad-originals",
                    storagePath,
                    SYSTEM_USER_ID
            );
            version.setId(DEMO_CUBE_VERSION_ID);
            version.setUnits("mm");
            version.setPreviewStatus("READY");
            version.setBboxXMm(10.0);
            version.setBboxYMm(10.0);
            version.setBboxZMm(10.0);
            version.setVolumeMm3(1000.0);
            version.setSurfaceAreaMm2(600.0);
            version.setTriangleCount(12);
            version.setIsWatertight(true);
            version.setSelectedMaterialId(AL6061_MATERIAL_ID);

            asset.addVersion(version);
            cadAssetRepository.save(asset);
            log.info("Seeded CAD Model: Standard Calibration Cube (10mm) [{}]", DEMO_CUBE_ASSET_ID);
        } catch (Exception e) {
            log.error("Failed to seed calibration cube CAD model: {}", e.getMessage(), e);
        }
    }

    private void seedAircraftBracket() {
        try {
            byte[] fileBytes = loadFixture("bracket.step");
            String sha256 = computeSha256(fileBytes);

            CadAsset asset = new CadAsset(SYSTEM_USER_ID, "High-Speed Aircraft Bracket",
                    "Aerospace bracket fixture with pocket and perimeter contour features.");
            asset.setId(DEMO_BRACKET_ASSET_ID);

            String storagePath = storageService.buildOriginalPath(DEMO_BRACKET_ASSET_ID, DEMO_BRACKET_VERSION_ID, "bracket.step");
            storageService.storeFile("cad-originals", storagePath, fileBytes, "application/step");

            CadVersion version = new CadVersion(
                    asset,
                    1,
                    "bracket.step",
                    "STEP",
                    fileBytes.length,
                    sha256,
                    "cad-originals",
                    storagePath,
                    SYSTEM_USER_ID
            );
            version.setId(DEMO_BRACKET_VERSION_ID);
            version.setUnits("mm");
            version.setPreviewStatus("READY");
            version.setBboxXMm(80.0);
            version.setBboxYMm(40.0);
            version.setBboxZMm(25.0);
            version.setVolumeMm3(32000.0);
            version.setSurfaceAreaMm2(12800.0);
            version.setTriangleCount(240);
            version.setIsWatertight(true);
            version.setSelectedMaterialId(AL6061_MATERIAL_ID);

            asset.addVersion(version);
            cadAssetRepository.save(asset);
            log.info("Seeded CAD Model: High-Speed Aircraft Bracket [{}]", DEMO_BRACKET_ASSET_ID);
        } catch (Exception e) {
            log.error("Failed to seed aircraft bracket CAD model: {}", e.getMessage(), e);
        }
    }

    private byte[] loadFixture(String filename) {
        // Try classpath resource first
        try (InputStream is = getClass().getResourceAsStream("/fixtures/" + filename)) {
            if (is != null) {
                return is.readAllBytes();
            }
        } catch (Exception ignored) {}

        // Fallback to disk paths
        Path[] candidates = new Path[]{
                Paths.get("src/main/resources/fixtures", filename),
                Paths.get("../fixtures", filename),
                Paths.get("fixtures", filename)
        };
        for (Path p : candidates) {
            if (Files.exists(p)) {
                try {
                    return Files.readAllBytes(p);
                } catch (Exception ignored) {}
            }
        }

        // Final fallback if file missing
        return ("solid " + filename + "\nendsolid " + filename).getBytes(StandardCharsets.UTF_8);
    }

    private String computeSha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "0000000000000000000000000000000000000000000000000000000000000000";
        }
    }
}
