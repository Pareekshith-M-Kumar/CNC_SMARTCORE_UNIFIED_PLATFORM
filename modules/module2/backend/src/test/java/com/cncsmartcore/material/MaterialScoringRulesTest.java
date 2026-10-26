package com.cncsmartcore.material;

import com.cncsmartcore.material.dto.MaterialRecommendationRequest;
import com.cncsmartcore.material.dto.RankedMaterialResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MaterialScoringRulesTest {

    private MaterialScoringRules rules;
    private List<Material> sampleMaterials;

    @BeforeEach
    void setUp() {
        rules = new MaterialScoringRules();

        sampleMaterials = List.of(
                new Material(
                        UUID.randomUUID(), "AL6061-T6", "Aluminium 6061-T6", "ALUMINIUM",
                        2700, 700, 200, 300, 0.003,
                        3, 4, 4, 5, 2, 350.00,
                        "structural_bracket,housing,fixture", "Aerospace aluminum", true
                ),
                new Material(
                        UUID.randomUUID(), "STEEL-1018", "Mild Steel 1018", "STEEL",
                        7850, 1500, 90, 140, 0.002,
                        4, 2, 2, 3, 1, 120.00,
                        "structural_bracket,shaft,weldment", "Mild steel", true
                ),
                new Material(
                        UUID.randomUUID(), "SS-304", "Stainless 304", "STAINLESS",
                        8000, 2100, 60, 100, 0.0015,
                        4, 2, 5, 2, 4, 550.00,
                        "marine,chemical,food", "Stainless steel", true
                ),
                new Material(
                        UUID.randomUUID(), "DELRIN", "Delrin Acetal", "PLASTIC",
                        1410, 350, 250, 450, 0.004,
                        2, 5, 5, 5, 2, 420.00,
                        "insulator,prototype,fixture", "Engineering plastic", true
                )
        );
    }

    @Test
    void rankMaterials_returnsAtLeastThreeResultsWithDeterministicScores() {
        MaterialRecommendationRequest request = new MaterialRecommendationRequest(
                "BALANCED", "INDOOR", "STRUCTURAL", null
        );

        List<RankedMaterialResult> results = rules.rankMaterials(sampleMaterials, request);

        // AC-14: At least 3 ranked candidates
        assertThat(results).hasSizeGreaterThanOrEqualTo(3);
        assertThat(results.get(0).rank()).isEqualTo(1);
        assertThat(results.get(1).rank()).isEqualTo(2);
        assertThat(results.get(2).rank()).isEqualTo(3);

        // Scores descending
        assertThat(results.get(0).score()).isGreaterThanOrEqualTo(results.get(1).score());
        assertThat(results.get(1).score()).isGreaterThanOrEqualTo(results.get(2).score());

        // Reasons populated
        assertThat(results.get(0).reasons()).isNotEmpty();
    }

    @Test
    void rankMaterials_weightPriority_ranksLightMaterialsTop() {
        MaterialRecommendationRequest request = new MaterialRecommendationRequest(
                "WEIGHT", "INDOOR", "HOUSING", null
        );

        List<RankedMaterialResult> results = rules.rankMaterials(sampleMaterials, request);

        // DELRIN (lightness 5) and AL6061 (lightness 4) should beat heavy STEEL-1018 and SS-304
        RankedMaterialResult top = results.get(0);
        assertThat(top.code()).isIn("DELRIN", "AL6061-T6");
        assertThat(top.lightnessRating()).isGreaterThanOrEqualTo(4);
    }

    @Test
    void rankMaterials_costPriority_ranksEconomicalSteelTop() {
        MaterialRecommendationRequest request = new MaterialRecommendationRequest(
                "COST", "INDOOR", "STRUCTURAL", null
        );

        List<RankedMaterialResult> results = rules.rankMaterials(sampleMaterials, request);

        // STEEL-1018 has cost level 1 (cost score 5/5) and cost 120/kg
        RankedMaterialResult top = results.get(0);
        assertThat(top.code()).isEqualTo("STEEL-1018");
        assertThat(top.reasons()).anyMatch(r -> r.contains("120.0"));
    }

    @Test
    void rankMaterials_marineEnvironment_rewardsStainlessAndWarnsLowCorrosion() {
        MaterialRecommendationRequest request = new MaterialRecommendationRequest(
                "CORROSION", "MARINE", "GENERAL", null
        );

        List<RankedMaterialResult> results = rules.rankMaterials(sampleMaterials, request);

        // SS-304 has corrosion rating 5 and marine tag
        RankedMaterialResult top = results.get(0);
        assertThat(top.code()).isIn("SS-304", "DELRIN");

        // STEEL-1018 has low corrosion rating and should have warning
        RankedMaterialResult steel = results.stream()
                .filter(r -> "STEEL-1018".equals(r.code()))
                .findFirst()
                .orElseThrow();
        assertThat(steel.warnings()).anyMatch(w -> w.toLowerCase().contains("marine"));
    }
}
