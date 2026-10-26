package com.cncsmartcore.material;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Order(10)
public class MaterialDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MaterialDataInitializer.class);
    private final MaterialRepository materialRepository;

    public MaterialDataInitializer(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    @Override
    public void run(String... args) {
        if (materialRepository.count() > 0) {
            log.info("Materials catalog already initialized with {} records.", materialRepository.count());
            return;
        }

        log.info("Seeding standard materials catalog with baseline engineering alloys...");

        List<Material> sampleMaterials = List.of(
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111101"),
                        "AL6061-T6",
                        "Aluminium 6061-T6",
                        "ALUMINIUM",
                        2700, 700, 200, 300, 0.003,
                        3, 4, 4, 5, 2, 350.00,
                        "structural_bracket,housing,fixture,prototype",
                        "Standard aerospace & prototyping aluminum. Excellent machinability.",
                        true
                ),
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111102"),
                        "STEEL-1018",
                        "Mild Steel AISI 1018",
                        "STEEL",
                        7850, 1500, 90, 140, 0.002,
                        4, 2, 2, 3, 1, 120.00,
                        "structural_bracket,shaft,weldment,fixture",
                        "General purpose low-carbon mild steel. Economical baseline.",
                        true
                ),
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111103"),
                        "SS-304",
                        "Stainless Steel 304",
                        "STAINLESS",
                        8000, 2100, 60, 100, 0.0015,
                        4, 2, 5, 2, 4, 550.00,
                        "food_grade,chemical,marine,housing",
                        "Corrosion resistant austenitic stainless steel. High work hardening.",
                        true
                ),
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111104"),
                        "DELRIN",
                        "Acetal / Delrin (POM)",
                        "PLASTIC",
                        1410, 350, 250, 450, 0.004,
                        2, 5, 5, 5, 2, 420.00,
                        "insulator,bushing,prototype,precision",
                        "Engineering thermoplastic with outstanding dimensional stability.",
                        true
                ),
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111105"),
                        "BRASS-360",
                        "Free-Machining Brass 360",
                        "BRASS",
                        8500, 750, 150, 250, 0.003,
                        3, 2, 4, 5, 3, 650.00,
                        "fitting,valve,instrumentation,housing",
                        "Superior machinability and natural lubricity.",
                        true
                ),
                new Material(
                        UUID.fromString("11111111-1111-1111-1111-111111111106"),
                        "TITANIUM-TI6AL4V",
                        "Titanium Grade 5 (Ti-6Al-4V)",
                        "TITANIUM",
                        4430, 2800, 35, 60, 0.0012,
                        5, 4, 5, 1, 5, 2200.00,
                        "aerospace,medical_implant,turbine,structural",
                        "High strength-to-weight ratio and biocompatibility. Low thermal conductivity.",
                        true
                )
        );

        materialRepository.saveAll(sampleMaterials);
        log.info("Successfully seeded {} materials.", sampleMaterials.size());
    }
}
