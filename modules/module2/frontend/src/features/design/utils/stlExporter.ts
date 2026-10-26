import * as THREE from 'three';

/**
 * Exports Three.js meshes to standard Binary STL format.
 * Binary STL format:
 * - 80-byte header string
 * - 4-byte unsigned int: triangle count
 * - For each triangle:
 *   - 3x float32 normal (nx, ny, nz)
 *   - 3x float32 vertex 1 (x, y, z)
 *   - 3x float32 vertex 2 (x, y, z)
 *   - 3x float32 vertex 3 (x, y, z)
 *   - 2-byte uint16 attribute byte count (0)
 */
export function exportMeshesToBinaryStl(
  meshes: THREE.Mesh[],
  headerText: string = 'CNC SmartCore AutoDesk CAD Studio STL Export'
): Blob {
  // Collect all world-transformed triangles
  interface Triangle {
    normal: THREE.Vector3;
    a: THREE.Vector3;
    b: THREE.Vector3;
    c: THREE.Vector3;
  }

  const triangles: Triangle[] = [];
  const normalMatrix = new THREE.Matrix3();

  for (const mesh of meshes) {
    if (!mesh.visible || !mesh.geometry) continue;

    const geometry = mesh.geometry.clone();
    mesh.updateWorldMatrix(true, false);
    geometry.applyMatrix4(mesh.matrixWorld);

    // Compute vertex normals if missing
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    const pos = geometry.attributes.position;
    const index = geometry.index;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const i0 = index.getX(i);
        const i1 = index.getX(i + 1);
        const i2 = index.getX(i + 2);

        const a = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
        const b = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
        const c = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

        const cb = new THREE.Vector3().subVectors(c, b);
        const ab = new THREE.Vector3().subVectors(a, b);
        const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();

        triangles.push({ normal, a, b, c });
      }
    } else if (pos) {
      for (let i = 0; i < pos.count; i += 3) {
        const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
        const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));

        const cb = new THREE.Vector3().subVectors(c, b);
        const ab = new THREE.Vector3().subVectors(a, b);
        const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();

        triangles.push({ normal, a, b, c });
      }
    }

    geometry.dispose();
  }

  const numTriangles = triangles.length;
  const bufferLength = 84 + numTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const dataView = new DataView(buffer);

  // 1. Write 80-byte header
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(headerText.slice(0, 79));
  for (let i = 0; i < headerBytes.length; i++) {
    dataView.setUint8(i, headerBytes[i]);
  }

  // 2. Write triangle count (Uint32, little-endian)
  dataView.setUint32(80, numTriangles, true);

  // 3. Write triangles
  let offset = 84;
  for (const tri of triangles) {
    // Normal
    dataView.setFloat32(offset, tri.normal.x, true);
    dataView.setFloat32(offset + 4, tri.normal.y, true);
    dataView.setFloat32(offset + 8, tri.normal.z, true);

    // Vertex 1
    dataView.setFloat32(offset + 12, tri.a.x, true);
    dataView.setFloat32(offset + 16, tri.a.y, true);
    dataView.setFloat32(offset + 20, tri.a.z, true);

    // Vertex 2
    dataView.setFloat32(offset + 24, tri.b.x, true);
    dataView.setFloat32(offset + 28, tri.b.y, true);
    dataView.setFloat32(offset + 32, tri.b.z, true);

    // Vertex 3
    dataView.setFloat32(offset + 36, tri.c.x, true);
    dataView.setFloat32(offset + 40, tri.c.y, true);
    dataView.setFloat32(offset + 44, tri.c.z, true);

    // Attribute byte count (uint16 = 0)
    dataView.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return new Blob([buffer], { type: 'model/stl' });
}
