package com.cncsmartcore.cam;

import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.tool.CuttingTool;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class CamParameterCalculatorTest {

    private CamParameterCalculator calculator;
    private Material sampleAl6061;
    private CuttingTool carbideEndMillD10;
    private MachineProfile vmcMachine;

    @BeforeEach
    void setUp() {
        calculator = new CamParameterCalculator();

        // Architecture.md §9.8 worked test vector parameters:
        // Al 6061: vc 200–300 (mid = 250 m/min), kc = 700 N/mm2, fz_factor = 0.003
        sampleAl6061 = new Material(
                UUID.randomUUID(), "AL6061-T6", "Aluminium 6061-T6", "ALUMINIUM",
                2700, 700, 200, 300, 0.003,
                3, 4, 4, 5, 2, 350.0,
                "structural_bracket,housing", "Standard 6061 alloy", true
        );

        // Carbide flat end mill: D = 10 mm, z = 3 flutes, fluteLen = 25 mm
        carbideEndMillD10 = new CuttingTool(
                UUID.randomUUID(), "10mm 3-Flute Carbide End Mill", "FLAT_END_MILL",
                10.0, 3, 25.0, 75.0,
                "CARBIDE", true, 1450.0,
                120.0, true, true
        );

        // Machine: maxRpm = 10000, ratedPower = 15.0 kW, eta = 0.80, maxFeed = 12000 mm/min
        vmcMachine = new MachineProfile(
                UUID.randomUUID(), "Haas VF-2", "GENERIC_ISO",
                762.0, 406.0, 508.0,
                10000, 15.0, 0.80,
                25400.0, 12000.0, 4.2,
                850.0, 1.2, true, true
        );
    }

    @Test
    @DisplayName("Matches Architecture §9.8 worked test vector: D10 z3 Vc250 -> n~7958 rpm, vf~716 mm/min, MRR~14324, Pc~0.209 kW")
    void testWorkedVectorFromArchitectureDoc() {
        // Op: ROUGH_POCKET with allowance = 2.0, part height = 25.0
        CamParameterCalculator.CalculatedParameters params = calculator.calculateOperationParameters(
                "ROUGH_POCKET", sampleAl6061, carbideEndMillD10, vmcMachine, 2.0, 25.0
        );

        // n = 250 * 1000 / (pi * 10) = 7957.7 -> 7958 rpm
        assertThat(params.spindleRpm()).isCloseTo(7958, within(5));

        // fz = 0.003 * 10 = 0.03 mm/tooth
        assertThat(params.feedPerToothFzMm()).isCloseTo(0.03, within(0.001));

        // vf = 0.03 * 3 * 7958 = 716.2 mm/min
        assertThat(params.feedMmMin()).isCloseTo(716.2, within(5.0));

        // ap = min(0.5*10, 0.8*25) = 5.0 mm; ae = 0.4*10 = 4.0 mm
        assertThat(params.apMm()).isEqualTo(5.0);
        assertThat(params.aeMm()).isEqualTo(4.0);

        // MRR = 5 * 4 * 716.2 = 14324 mm3/min
        assertThat(params.mrrMm3PerMin()).isCloseTo(14324.0, within(100.0));

        // Pc = 14324 * 700 / (60 * 10^6 * 0.8) = 0.209 kW
        assertThat(params.cuttingPowerKw()).isCloseTo(0.209, within(0.015));
    }

    @Test
    @DisplayName("Clamps theoretical RPM to machine max RPM if speed exceeds spindle limit")
    void testClampsSpindleRpmToMachineMax() {
        // Machine with lower 5000 RPM spindle limit
        MachineProfile lowSpeedMachine = new MachineProfile(
                UUID.randomUUID(), "Low Speed Router", "GENERIC_ISO",
                300.0, 300.0, 100.0,
                5000, 3.0, 0.80,
                5000.0, 3000.0, 10.0,
                300.0, 0.5, true, true
        );

        CamParameterCalculator.CalculatedParameters params = calculator.calculateOperationParameters(
                "ROUGH_POCKET", sampleAl6061, carbideEndMillD10, lowSpeedMachine, 2.0, 25.0
        );

        assertThat(params.spindleRpm()).isEqualTo(5000);
        // Table feed should also be computed from clamped RPM: 0.03 * 3 * 5000 = 450 mm/min
        assertThat(params.feedMmMin()).isCloseTo(450.0, within(2.0));
    }

    @Test
    @DisplayName("HSS tools apply 0.35 cutting speed reduction factor compared to Carbide")
    void testHssToolSpeedReduction() {
        CuttingTool hssTool = new CuttingTool(
                UUID.randomUUID(), "10mm HSS End Mill", "FLAT_END_MILL",
                10.0, 3, 25.0, 75.0,
                "HSS", true, 450.0,
                45.0, true, true
        );

        CamParameterCalculator.CalculatedParameters params = calculator.calculateOperationParameters(
                "ROUGH_POCKET", sampleAl6061, hssTool, vmcMachine, 2.0, 25.0
        );

        // Vc = 250 * 0.35 = 87.5 m/min -> theoretical RPM ~ 2785
        assertThat(params.spindleRpm()).isCloseTo(2785, within(10));
    }
}
