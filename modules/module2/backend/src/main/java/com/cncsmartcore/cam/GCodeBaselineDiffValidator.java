package com.cncsmartcore.cam;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * GCodeBaselineDiffValidator
 *
 * Implements security verification to detect coordinate drift, manual offset tampering,
 * or malicious macro injection between a baseline approved G-code program and a candidate execution program.
 * Complies with Milestone 9 baseline-diff validator specification (ARCHITECTURE.md §8 & PRD FR-S4).
 */
@Component
public class GCodeBaselineDiffValidator {

    private static final Logger log = LoggerFactory.getLogger(GCodeBaselineDiffValidator.class);

    public static final double DEFAULT_TOLERANCE_MM = 0.05;

    private static final Pattern MOTION_PATTERN = Pattern.compile("\\b(G0?[0-3])\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern COORD_PATTERN = Pattern.compile("([XYZFSE])(-?\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FORBIDDEN_MACRO_PATTERN = Pattern.compile("\\b(G10|G28|G53|M98|M99|#\\d+)\\b", Pattern.CASE_INSENSITIVE);

    public record DiffViolation(
            int lineNumber,
            String violationType,
            String axis,
            double baselineValue,
            double candidateValue,
            double delta,
            String details
    ) {}

    public record GCodeDiffResult(
            boolean valid,
            int baselineBlocks,
            int candidateBlocks,
            double maxDelta,
            List<DiffViolation> violations
    ) {}

    public GCodeDiffResult validateAgainstBaseline(String baselineGCode, String candidateGCode) {
        return validateAgainstBaseline(baselineGCode, candidateGCode, DEFAULT_TOLERANCE_MM);
    }

    public GCodeDiffResult validateAgainstBaseline(String baselineGCode, String candidateGCode, double toleranceMm) {
        List<DiffViolation> violations = new ArrayList<>();
        double maxObservedDelta = 0.0;

        if (baselineGCode == null || candidateGCode == null) {
            violations.add(new DiffViolation(0, "NULL_PAYLOAD", "N/A", 0, 0, 0, "Baseline or candidate G-code is null"));
            return new GCodeDiffResult(false, 0, 0, 0, violations);
        }

        List<ParsedBlock> baselineBlocks = extractMotionBlocks(baselineGCode);
        List<ParsedBlock> candidateBlocks = extractMotionBlocks(candidateGCode);

        // 1. Check for forbidden macro injection in candidate
        String[] candidateLines = candidateGCode.split("\\r?\\n");
        for (int i = 0; i < candidateLines.length; i++) {
            Matcher matcher = FORBIDDEN_MACRO_PATTERN.matcher(candidateLines[i]);
            if (matcher.find()) {
                violations.add(new DiffViolation(
                        i + 1,
                        "INJECTED_FORBIDDEN_CODE",
                        matcher.group(),
                        0, 0, 0,
                        "Detected unauthorized override or macro instruction: " + matcher.group()
                ));
            }
        }

        // 2. Block count integrity check
        if (baselineBlocks.size() != candidateBlocks.size()) {
            violations.add(new DiffViolation(
                    0,
                    "BLOCK_COUNT_MISMATCH",
                    "COUNT",
                    baselineBlocks.size(),
                    candidateBlocks.size(),
                    Math.abs(baselineBlocks.size() - candidateBlocks.size()),
                    String.format("Motion block count altered: baseline had %d, candidate has %d blocks",
                            baselineBlocks.size(), candidateBlocks.size())
            ));
        }

        // 3. Coordinate-by-coordinate comparison
        int compareCount = Math.min(baselineBlocks.size(), candidateBlocks.size());
        for (int i = 0; i < compareCount; i++) {
            ParsedBlock base = baselineBlocks.get(i);
            ParsedBlock cand = candidateBlocks.get(i);

            // Motion code match check (G00 vs G01)
            if (!base.motionCode.equalsIgnoreCase(cand.motionCode)) {
                violations.add(new DiffViolation(
                        cand.lineNumber,
                        "MOTION_TYPE_TAMPER",
                        "G_CODE",
                        0, 0, 0,
                        String.format("Motion type changed from %s to %s", base.motionCode, cand.motionCode)
                ));
            }

            // X Axis check
            if (base.hasX && cand.hasX) {
                double deltaX = Math.abs(cand.x - base.x);
                maxObservedDelta = Math.max(maxObservedDelta, deltaX);
                if (deltaX > toleranceMm) {
                    violations.add(new DiffViolation(
                            cand.lineNumber,
                            "COORDINATE_TAMPER",
                            "X",
                            base.x, cand.x, deltaX,
                            String.format("X coordinate drifted by %.4f mm (tolerance: %.4f mm)", deltaX, toleranceMm)
                    ));
                }
            } else if (base.hasX != cand.hasX) {
                violations.add(new DiffViolation(cand.lineNumber, "AXIS_MISMATCH", "X", 0, 0, 0, "X coordinate added or removed"));
            }

            // Y Axis check
            if (base.hasY && cand.hasY) {
                double deltaY = Math.abs(cand.y - base.y);
                maxObservedDelta = Math.max(maxObservedDelta, deltaY);
                if (deltaY > toleranceMm) {
                    violations.add(new DiffViolation(
                            cand.lineNumber,
                            "COORDINATE_TAMPER",
                            "Y",
                            base.y, cand.y, deltaY,
                            String.format("Y coordinate drifted by %.4f mm (tolerance: %.4f mm)", deltaY, toleranceMm)
                    ));
                }
            } else if (base.hasY != cand.hasY) {
                violations.add(new DiffViolation(cand.lineNumber, "AXIS_MISMATCH", "Y", 0, 0, 0, "Y coordinate added or removed"));
            }

            // Z Axis check (critical for spindle plunging / collision)
            if (base.hasZ && cand.hasZ) {
                double deltaZ = Math.abs(cand.z - base.z);
                maxObservedDelta = Math.max(maxObservedDelta, deltaZ);
                if (deltaZ > toleranceMm) {
                    violations.add(new DiffViolation(
                            cand.lineNumber,
                            "COORDINATE_TAMPER",
                            "Z",
                            base.z, cand.z, deltaZ,
                            String.format("Z depth drifted by %.4f mm (tolerance: %.4f mm)", deltaZ, toleranceMm)
                    ));
                }
            } else if (base.hasZ != cand.hasZ) {
                violations.add(new DiffViolation(cand.lineNumber, "AXIS_MISMATCH", "Z", 0, 0, 0, "Z coordinate added or removed"));
            }
        }

        boolean valid = violations.isEmpty();
        if (!valid) {
            log.warn("G-code baseline diff validation failed with {} violation(s). Max delta: {} mm",
                    violations.size(), maxObservedDelta);
        }

        return new GCodeDiffResult(valid, baselineBlocks.size(), candidateBlocks.size(), maxObservedDelta, violations);
    }

    private List<ParsedBlock> extractMotionBlocks(String gcode) {
        List<ParsedBlock> blocks = new ArrayList<>();
        String[] lines = gcode.split("\\r?\\n");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty() || line.startsWith("(") || line.startsWith("%")) {
                continue;
            }

            // Strip inline comments
            String cleanLine = line.replaceAll("\\(.*?\\)", "").trim();
            Matcher motionMatcher = MOTION_PATTERN.matcher(cleanLine);
            if (!motionMatcher.find()) {
                continue;
            }

            String motionCode = motionMatcher.group(1).toUpperCase();
            ParsedBlock block = new ParsedBlock(i + 1, motionCode);

            Matcher coordMatcher = COORD_PATTERN.matcher(cleanLine);
            while (coordMatcher.find()) {
                String axis = coordMatcher.group(1).toUpperCase();
                double value = Double.parseDouble(coordMatcher.group(2));
                switch (axis) {
                    case "X" -> { block.x = value; block.hasX = true; }
                    case "Y" -> { block.y = value; block.hasY = true; }
                    case "Z" -> { block.z = value; block.hasZ = true; }
                    case "F" -> { block.feedRate = value; block.hasFeed = true; }
                }
            }

            blocks.add(block);
        }

        return blocks;
    }

    private static class ParsedBlock {
        final int lineNumber;
        final String motionCode;
        double x, y, z, feedRate;
        boolean hasX, hasY, hasZ, hasFeed;

        ParsedBlock(int lineNumber, String motionCode) {
            this.lineNumber = lineNumber;
            this.motionCode = motionCode;
        }
    }
}
