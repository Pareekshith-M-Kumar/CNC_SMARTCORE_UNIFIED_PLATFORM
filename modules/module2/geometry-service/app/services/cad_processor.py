import base64
import hashlib
import io
from typing import Any

import trimesh

from app.services.ai_estimator import ai_machining_advisor


def process_cad(
    file_bytes: bytes,
    filename: str,
    file_format: str,
    units: str = "mm"
) -> dict[str, Any]:
    """
    Process CAD geometry: validate, extract metrics, decimate if needed,
    generate GLB preview, and attach AI machinability assessment.
    """
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()
    fmt = file_format.upper()
    warnings: list[str] = []

    if fmt == "STL":
        try:
            # Load mesh with trimesh
            mesh = trimesh.load(io.BytesIO(file_bytes), file_type="stl", force="mesh")

            if not isinstance(mesh, trimesh.Trimesh) and hasattr(mesh, "dump"):
                # In case of Scene or multiple geometries
                geoms = mesh.dump()
                mesh = trimesh.util.concatenate(geoms)

            bounds = mesh.bounds
            bbox_x = float(bounds[1][0] - bounds[0][0])
            bbox_y = float(bounds[1][1] - bounds[0][1])
            bbox_z = float(bounds[1][2] - bounds[0][2])

            is_watertight = bool(mesh.is_watertight)
            volume = float(mesh.volume) if is_watertight else float(mesh.convex_hull.volume)
            surface_area = float(mesh.area)
            triangle_count = len(mesh.faces)

            # Decimate if exceeding 200,000 triangles for responsive browser rendering
            if triangle_count > 200000:
                warnings.append(f"Mesh decimated from {triangle_count} to 200,000 triangles for viewport performance.")
                try:
                    mesh = mesh.simplify_quadric_decimation(200000)
                    triangle_count = len(mesh.faces)
                except (ValueError, RuntimeError, AttributeError) as dec_err:
                    warnings.append(f"Decimation skipped: {dec_err!s}")

            # Export GLB binary preview
            glb_bytes = trimesh.exchange.gltf.export_glb(mesh)
            glb_base64 = base64.b64encode(glb_bytes).decode("utf-8")

            # Run AI machinability assessment on geometry
            ai_eval = ai_machining_advisor.assess_geometry(
                bbox_x, bbox_y, bbox_z, volume, surface_area, is_watertight
            )
            warnings.extend(ai_eval.get("warnings", []))

            return {
                "sha256": sha256_hash,
                "previewStatus": "READY",
                "previewError": None,
                "bboxXMm": round(bbox_x, 2),
                "bboxYMm": round(bbox_y, 2),
                "bboxZMm": round(bbox_z, 2),
                "volumeMm3": round(volume, 2),
                "surfaceAreaMm2": round(surface_area, 2),
                "triangleCount": triangle_count,
                "isWatertight": is_watertight,
                "previewGlbBase64": glb_base64,
                "warnings": warnings,
                "aiMachinability": ai_eval,
            }
        except Exception as e:  # noqa: BLE001 - Geometry parsing from arbitrary CAD files may raise diverse library errors
            return {
                "sha256": sha256_hash,
                "previewStatus": "FAILED",
                "previewError": f"STL processing error: {e!s}",
                "bboxXMm": None,
                "bboxYMm": None,
                "bboxZMm": None,
                "volumeMm3": None,
                "surfaceAreaMm2": None,
                "triangleCount": None,
                "isWatertight": None,
                "previewGlbBase64": None,
                "warnings": [str(e)],
            }

    elif fmt in ("STEP", "IGES"):
        # Documented fallback per AC-14: B-rep solids require native OpenCASCADE
        return {
            "sha256": sha256_hash,
            "previewStatus": "UNSUPPORTED",
            "previewError": f"{fmt} preview requires native OpenCASCADE engine. File is securely stored and hashed; upload STL for 3D viewer.",
            "bboxXMm": None,
            "bboxYMm": None,
            "bboxZMm": None,
            "volumeMm3": None,
            "surfaceAreaMm2": None,
            "triangleCount": None,
            "isWatertight": None,
            "previewGlbBase64": None,
            "warnings": [f"{fmt} format stored without 3D tessellation preview."],
        }
    else:
        return {
            "sha256": sha256_hash,
            "previewStatus": "FAILED",
            "previewError": f"Unsupported format: {fmt}",
            "bboxXMm": None,
            "bboxYMm": None,
            "bboxZMm": None,
            "volumeMm3": None,
            "surfaceAreaMm2": None,
            "triangleCount": None,
            "isWatertight": None,
            "previewGlbBase64": None,
            "warnings": [f"Format {fmt} is not supported"],
        }
