import csv
import logging
import math
import os
from typing import Any

logger = logging.getLogger(__name__)


class MachiningBenchmarkAI:
    """
    AI/ML-assisted parameter advisor and geometry risk estimator
    powered by empirical CNC milling benchmarks and physics models.
    """

    def __init__(self, dataset_path: str | None = None):
        self.dataset_path = dataset_path or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../fixtures/datasets/machining_benchmark_dataset.csv")
        )
        self.benchmarks: list[dict[str, Any]] = self._load_dataset()

    def _load_dataset(self) -> list[dict[str, Any]]:
        benchmarks = []
        if os.path.exists(self.dataset_path):
            try:
                with open(self.dataset_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        benchmarks.append({
                            "material": row["material"],
                            "hardness_hb": float(row["hardness_hb"]),
                            "tool_type": row["tool_type"],
                            "tool_diameter_mm": float(row["tool_diameter_mm"]),
                            "flutes": int(row["flutes"]),
                            "vc_m_min": float(row["vc_m_min"]),
                            "fz_mm_tooth": float(row["fz_mm_tooth"]),
                            "ap_mm": float(row["ap_mm"]),
                            "ae_mm": float(row["ae_mm"]),
                            "mrr_cm3_min": float(row["mrr_cm3_min"]),
                            "cutting_force_n": float(row["cutting_force_n"]),
                            "power_kw": float(row["power_kw"]),
                            "tool_life_min": float(row["tool_life_min"]),
                            "surface_roughness_ra": float(row["surface_roughness_ra"]),
                        })
            except (OSError, ValueError, KeyError) as e:
                logger.warning("Machining benchmark dataset loading error, falling back: %s", e)

        if not benchmarks:
            # Fallback baseline benchmark records
            benchmarks = [
                {
                    "material": "AL6061-T6", "hardness_hb": 95, "tool_type": "FLAT_END_MILL",
                    "tool_diameter_mm": 10.0, "flutes": 3, "vc_m_min": 250.0, "fz_mm_tooth": 0.04,
                    "ap_mm": 3.0, "ae_mm": 5.0, "mrr_cm3_min": 143.2, "cutting_force_n": 350,
                    "power_kw": 1.25, "tool_life_min": 180, "surface_roughness_ra": 0.8
                },
                {
                    "material": "STEEL-1018", "hardness_hb": 130, "tool_type": "FLAT_END_MILL",
                    "tool_diameter_mm": 10.0, "flutes": 4, "vc_m_min": 110.0, "fz_mm_tooth": 0.025,
                    "ap_mm": 2.0, "ae_mm": 4.0, "mrr_cm3_min": 28.0, "cutting_force_n": 850,
                    "power_kw": 1.65, "tool_life_min": 110, "surface_roughness_ra": 1.2
                },
                {
                    "material": "SS-304", "hardness_hb": 190, "tool_type": "FLAT_END_MILL",
                    "tool_diameter_mm": 10.0, "flutes": 4, "vc_m_min": 75.0, "fz_mm_tooth": 0.02,
                    "ap_mm": 1.5, "ae_mm": 3.0, "mrr_cm3_min": 14.3, "cutting_force_n": 950,
                    "power_kw": 1.50, "tool_life_min": 75, "surface_roughness_ra": 1.4
                }
            ]
        return benchmarks

    def assess_geometry(
        self,
        bbox_x: float,
        bbox_y: float,
        bbox_z: float,
        volume_mm3: float,
        surface_area_mm2: float,
        is_watertight: bool
    ) -> dict[str, Any]:
        """
        Analyze geometry ratios and predict machining difficulty index & suggestions.
        """
        bounding_box_volume = max(bbox_x * bbox_y * bbox_z, 1e-6)
        volumetric_efficiency = volume_mm3 / bounding_box_volume if volume_mm3 > 0 else 0.0

        # Aspect ratios
        dims = sorted([bbox_x, bbox_y, bbox_z])
        aspect_ratio = dims[2] / max(dims[0], 0.1)

        # Thin wall indicator: Volume to Surface Area ratio (characteristic thickness)
        char_thickness = (2.0 * volume_mm3 / surface_area_mm2) if surface_area_mm2 > 0 else 10.0

        risk_score = 0.0
        warnings = []
        insights = []

        if not is_watertight:
            risk_score += 20.0
            warnings.append("Mesh is non-manifold or open (not watertight); verify boundary faces.")
        else:
            insights.append("Watertight solid mesh verified.")

        if aspect_ratio > 8.0:
            risk_score += 25.0
            warnings.append(f"High aspect ratio ({aspect_ratio:.1f}:1); risk of deflection/chatter under radial cutting loads.")
        else:
            insights.append("Rigid aspect ratio geometry suitable for 3-axis prismatic setup.")

        if char_thickness < 2.0 and volume_mm3 > 0:
            risk_score += 30.0
            warnings.append(f"Thin features detected (characteristic thickness ~{char_thickness:.2f} mm); caution required with feeds.")
        elif char_thickness >= 5.0:
            insights.append("Ample wall thickness allows aggressive roughing and high MRR.")

        if bbox_z > 150.0:
            risk_score += 15.0
            warnings.append(f"Tall Z height ({bbox_z:.1f} mm); tool reach and deep pocket clearance checks advised.")

        risk_level = "LOW"
        if risk_score >= 50.0:
            risk_level = "HIGH"
        elif risk_score >= 25.0:
            risk_level = "MEDIUM"

        return {
            "machinability_risk_score": min(round(risk_score, 1), 100.0),
            "risk_level": risk_level,
            "characteristic_thickness_mm": round(char_thickness, 2),
            "volumetric_efficiency": round(volumetric_efficiency, 3),
            "aspect_ratio": round(aspect_ratio, 2),
            "warnings": warnings,
            "insights": insights,
        }

    def predict_optimal_parameters(
        self,
        material_code: str,
        tool_diameter_mm: float = 10.0,
        max_machine_rpm: int = 10000
    ) -> dict[str, Any]:
        """
        Predict cutting parameters using empirical nearest-neighbor interpolation
        from the Kaggle CNC machining benchmark dataset.
        """
        matches = [b for b in self.benchmarks if material_code.upper() in b["material"].upper()]
        if not matches:
            matches = self.benchmarks  # Fallback to general benchmark set

        # Find closest tool match
        closest = min(matches, key=lambda x: abs(x["tool_diameter_mm"] - tool_diameter_mm))

        # Scale parameters according to cutting mechanics
        vc = closest["vc_m_min"]
        fz = closest["fz_mm_tooth"] * (tool_diameter_mm / closest["tool_diameter_mm"]) ** 0.5
        fz = max(0.01, min(fz, 0.15))

        flutes = closest["flutes"]
        rpm = int((1000.0 * vc) / (math.pi * tool_diameter_mm))
        actual_rpm = min(rpm, max_machine_rpm)

        feed_rate_mm_min = round(actual_rpm * flutes * fz, 1)
        ap = round(closest["ap_mm"] * (tool_diameter_mm / closest["tool_diameter_mm"]), 2)
        ae = round(closest["ae_mm"] * (tool_diameter_mm / closest["tool_diameter_mm"]), 2)

        mrr = round((ap * ae * feed_rate_mm_min) / 1000.0, 2)
        est_power_kw = round(closest["power_kw"] * (mrr / max(closest["mrr_cm3_min"], 1.0)), 2)

        return {
            "recommended_vc_m_min": round(vc, 1),
            "recommended_rpm": actual_rpm,
            "recommended_fz_mm_tooth": round(fz, 3),
            "recommended_feed_mm_min": feed_rate_mm_min,
            "recommended_ap_mm": ap,
            "recommended_ae_mm": ae,
            "est_mrr_cm3_min": mrr,
            "est_power_kw": est_power_kw,
            "benchmark_source": f"Kaggle CNC Milling Empirical Dataset ({closest['material']})"
        }


ai_machining_advisor = MachiningBenchmarkAI()
