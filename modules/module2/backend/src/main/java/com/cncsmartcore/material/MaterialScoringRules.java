package com.cncsmartcore.material;

import com.cncsmartcore.material.dto.MaterialRecommendationRequest;
import com.cncsmartcore.material.dto.RankedMaterialResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class MaterialScoringRules {

    public static final String ALGORITHM_VERSION = "rb-1.0";
    public static final String LABEL = "Rule-based recommendation";

    public List<RankedMaterialResult> rankMaterials(List<Material> materials, MaterialRecommendationRequest inputs) {
        String priority = inputs.priority() != null ? inputs.priority().toUpperCase() : "BALANCED";
        String env = inputs.environment() != null ? inputs.environment().toUpperCase() : "INDOOR";
        String appType = inputs.applicationType() != null ? inputs.applicationType().toUpperCase() : "GENERAL";
        Double budget = inputs.maxBudgetPerKg();

        // Weights: [strength, lightness, corrosion, machinability, cost]
        double wStr;
        double wLight;
        double wCorr;
        double wMach;
        double wCost;

        switch (priority) {
            case "STRENGTH" -> {
                wStr = 0.40; wLight = 0.15; wMach = 0.15; wCost = 0.15; wCorr = 0.15;
            }
            case "WEIGHT" -> {
                wLight = 0.45; wStr = 0.20; wMach = 0.15; wCost = 0.10; wCorr = 0.10;
            }
            case "COST" -> {
                wCost = 0.55; wMach = 0.15; wStr = 0.15; wLight = 0.05; wCorr = 0.10;
            }
            case "CORROSION" -> {
                wCorr = 0.45; wStr = 0.15; wMach = 0.15; wCost = 0.15; wLight = 0.10;
            }
            case "MACHINABILITY" -> {
                wMach = 0.45; wCost = 0.20; wLight = 0.15; wStr = 0.10; wCorr = 0.10;
            }
            default -> { // BALANCED
                wStr = 0.20; wLight = 0.20; wCorr = 0.20; wMach = 0.20; wCost = 0.20;
            }
        }

        List<ScoredEntry> scoredEntries = new ArrayList<>();

        for (Material m : materials) {
            List<String> reasons = new ArrayList<>();
            List<String> warnings = new ArrayList<>();

            // 1. Base Multi-Criteria Score (0 - 100)
            // Ratings: 1-5. Cost score is (6 - costLevel) so 1 (cheapest) gets 5.
            double costRating = 6.0 - m.getCostLevel();
            double baseScore = (wStr * m.getStrengthRating()
                    + wLight * m.getLightnessRating()
                    + wCorr * m.getCorrosionRating()
                    + wMach * m.getMachinabilityRating()
                    + wCost * costRating) * 20.0;

            double finalScore = baseScore;

            // Generate criteria reasons
            if ("STRENGTH".equals(priority) && m.getStrengthRating() >= 4) {
                reasons.add("High yield strength rating (" + m.getStrengthRating() + "/5) handles demanding structural load cases");
            }
            if ("WEIGHT".equals(priority) && m.getLightnessRating() >= 4) {
                reasons.add("Low material density (" + (int) m.getDensityKgM3() + " kg/m³) provides optimal lightness (" + m.getLightnessRating() + "/5)");
            }
            if ("MACHINABILITY".equals(priority) && m.getMachinabilityRating() >= 4) {
                reasons.add("Top machinability rating (" + m.getMachinabilityRating() + "/5) minimizes spindle power and cutting cycle duration");
            }
            if ("COST".equals(priority) && m.getCostLevel() <= 2) {
                if (m.getCostLevel() == 1) {
                    finalScore += 4.0;
                }
                reasons.add("Economical raw billet pricing (" + m.getCostPerKg() + " / kg) reduces manufacturing bill of materials");
            }
            if ("CORROSION".equals(priority) && m.getCorrosionRating() >= 4) {
                reasons.add("Superior passive oxidation layer ensures high corrosion resistance (" + m.getCorrosionRating() + "/5)");
            }

            // 2. Environmental Rules & Modifiers
            switch (env) {
                case "MARINE" -> {
                    if (m.getCorrosionRating() >= 4) {
                        finalScore += 8.0;
                        reasons.add("Resistant to marine atmospheric chloride exposure");
                    } else if (m.getCorrosionRating() <= 2) {
                        finalScore -= 20.0;
                        warnings.add("Elevated galvanic / pitting corrosion risk in marine environments without protective plating");
                    }
                }
                case "CHEMICAL" -> {
                    if ("STAINLESS".equals(m.getCategory()) || "TITANIUM".equals(m.getCategory()) || "PLASTIC".equals(m.getCategory())) {
                        finalScore += 10.0;
                        reasons.add("High chemical passivity resistant to acidic / solvent contact");
                    } else {
                        finalScore -= 15.0;
                        warnings.add("Chemical immersion requires protective barrier coatings or specialized anodizing");
                    }
                }
                case "HIGH_TEMP" -> {
                    if ("PLASTIC".equals(m.getCategory())) {
                        finalScore -= 35.0;
                        warnings.add("Thermoplastic heat deflection threshold exceeded under continuous elevated temperatures");
                    } else if ("TITANIUM".equals(m.getCategory()) || "STAINLESS".equals(m.getCategory())) {
                        finalScore += 8.0;
                        reasons.add("Retains mechanical strength and creep resistance at elevated temperatures");
                    }
                }
                case "OUTDOOR" -> {
                    if (m.getCorrosionRating() <= 2) {
                        warnings.add("Susceptible to rust/oxidation in open outdoor exposure without surface treatment");
                    }
                }
            }

            // 3. Application matching
            if (m.getSuitableApplications() != null && !m.getSuitableApplications().isBlank()) {
                String appLower = appType.toLowerCase();
                String suitLower = m.getSuitableApplications().toLowerCase();
                if (suitLower.contains(appLower) || suitLower.contains("structural") && "STRUCTURAL".equals(appType)) {
                    finalScore += 5.0;
                    reasons.add("Industry standard alloy specifically categorized for " + appType.toLowerCase() + " components");
                }
            }

            // 4. Budget Constraint
            if (budget != null && budget > 0 && m.getCostPerKg() > budget) {
                finalScore -= 15.0;
                warnings.add("Base material cost (" + m.getCostPerKg() + "/kg) exceeds specified target budget (" + budget + "/kg)");
            }

            // Clamp between 5.0 and 99.0
            finalScore = Math.max(5.0, Math.min(99.0, Math.round(finalScore * 10.0) / 10.0));

            // Default reason if empty
            if (reasons.isEmpty()) {
                reasons.add("Balanced mechanical and machining performance across standard CNC operations");
            }

            scoredEntries.add(new ScoredEntry(m, finalScore, reasons, warnings));
        }

        // Sort descending by score, tie-break by machinability rating descending
        scoredEntries.sort((a, b) -> {
            int cmp = Double.compare(b.score(), a.score());
            if (cmp != 0) return cmp;
            return Integer.compare(b.material().getMachinabilityRating(), a.material().getMachinabilityRating());
        });

        List<RankedMaterialResult> results = new ArrayList<>();
        int rank = 1;
        for (ScoredEntry entry : scoredEntries) {
            Material m = entry.material();
            results.add(new RankedMaterialResult(
                    rank++,
                    m.getId(),
                    m.getCode(),
                    m.getName(),
                    m.getCategory(),
                    entry.score(),
                    m.getStrengthRating(),
                    m.getLightnessRating(),
                    m.getCorrosionRating(),
                    m.getMachinabilityRating(),
                    m.getCostLevel(),
                    m.getCostPerKg(),
                    entry.reasons(),
                    entry.warnings()
            ));
        }

        return results;
    }

    private record ScoredEntry(Material material, double score, List<String> reasons, List<String> warnings) {}
}
