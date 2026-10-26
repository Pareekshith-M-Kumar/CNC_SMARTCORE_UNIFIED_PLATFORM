package com.cncsmartcore.cam;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GCodeBaselineDiffValidatorTest {

    private GCodeBaselineDiffValidator validator;

    private static final String BASELINE_PROGRAM = """
            %
            O0100 (TEST BRACKET PROGRAM)
            G21 G90 G17 G40 G49 G80 G54
            (OP 1: ROUGHING)
            T01 M06
            S6000 M03
            G43 H01 Z15.000
            G00 X0.000 Y0.000 Z5.000
            G01 Z-2.500 F250.0
            G01 X50.000 Y0.000 F800.0
            G01 X50.000 Y50.000
            G01 X0.000 Y50.000
            G01 X0.000 Y0.000
            G00 Z25.000
            M05
            M30
            %
            """;

    @BeforeEach
    void setUp() {
        validator = new GCodeBaselineDiffValidator();
    }

    @Test
    @DisplayName("Identical candidate G-code against baseline passes validation with zero violations")
    void identicalProgramPasses() {
        var result = validator.validateAgainstBaseline(BASELINE_PROGRAM, BASELINE_PROGRAM);
        assertTrue(result.valid(), "Identical G-code must be valid");
        assertEquals(0, result.violations().size());
        assertEquals(0.0, result.maxDelta(), 0.0001);
        assertEquals(7, result.baselineBlocks());
        assertEquals(7, result.candidateBlocks());
    }

    @Test
    @DisplayName("Candidate G-code with minor coordinate shift within tolerance (0.01mm <= 0.05mm) passes")
    void minorShiftWithinTolerancePasses() {
        String candidate = BASELINE_PROGRAM.replace("X50.000 Y0.000", "X50.010 Y0.000");
        var result = validator.validateAgainstBaseline(BASELINE_PROGRAM, candidate, 0.05);
        assertTrue(result.valid(), "Minor drift within 0.05mm tolerance must pass");
        assertEquals(0, result.violations().size());
        assertEquals(0.010, result.maxDelta(), 0.001);
    }

    @Test
    @DisplayName("Candidate G-code with tampered coordinate (> 0.05mm) triggers COORDINATE_TAMPER violation")
    void tamperedCoordinateTriggersViolation() {
        // Tamper X from 50.000 to 50.250 (0.250mm deviation)
        String candidate = BASELINE_PROGRAM.replace("X50.000 Y0.000", "X50.250 Y0.000");
        var result = validator.validateAgainstBaseline(BASELINE_PROGRAM, candidate, 0.05);

        assertFalse(result.valid(), "Tampered coordinate must fail validation");
        assertTrue(result.violations().stream().anyMatch(v -> "COORDINATE_TAMPER".equals(v.violationType()) && "X".equals(v.axis())));
        assertEquals(0.250, result.maxDelta(), 0.001);
    }

    @Test
    @DisplayName("Candidate G-code with injected forbidden macro code (G10 system override) fails")
    void injectedForbiddenCodeTriggersViolation() {
        String candidate = BASELINE_PROGRAM.replace("G00 Z25.000", "G10 L2 P1 X-10.0\nG00 Z25.000");
        var result = validator.validateAgainstBaseline(BASELINE_PROGRAM, candidate);

        assertFalse(result.valid(), "Injected G10 parameter write must fail validation");
        assertTrue(result.violations().stream().anyMatch(v -> "INJECTED_FORBIDDEN_CODE".equals(v.violationType())));
    }

    @Test
    @DisplayName("Candidate G-code with deleted motion block triggers BLOCK_COUNT_MISMATCH")
    void deletedMotionBlockTriggersMismatch() {
        // Remove a motion block
        String candidate = BASELINE_PROGRAM.replace("G01 X0.000 Y50.000\n", "");
        var result = validator.validateAgainstBaseline(BASELINE_PROGRAM, candidate);

        assertFalse(result.valid(), "Altered motion sequence block count must fail");
        assertTrue(result.violations().stream().anyMatch(v -> "BLOCK_COUNT_MISMATCH".equals(v.violationType())));
    }
}
