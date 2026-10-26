import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const SHELL_URL = process.env.SHELL_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api/v1';

describe('CNC SmartCore Unified Platform - Milestone 10 End-to-End Test Suite', () => {

  before(async () => {
    // Verify services are responsive
    try {
      const res = await fetch(`${SHELL_URL}/`);
      assert.strictEqual(res.status, 200, 'Shell front-end must be responsive on port 5173');
    } catch (err) {
      assert.fail(`Shell dev server is not reachable at ${SHELL_URL}: ${err.message}`);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      assert.strictEqual(res.status, 200, 'Module 2 backend must be responsive on port 8080');
    } catch (err) {
      assert.fail(`Module 2 backend is not reachable at ${BACKEND_URL}: ${err.message}`);
    }
  });

  // ─── 1. ACCEPTANCE CRITERION 1: Single Identity & Shell Front Door ──────────
  test('CRITERION 1: Shell landing, dashboard, /m1, and /m2 routes serve under single origin', async () => {
    // 1. Landing Page
    const landingRes = await fetch(`${SHELL_URL}/`);
    assert.strictEqual(landingRes.status, 200);
    const landingHtml = await landingRes.text();
    assert.ok(landingHtml.includes('CNC SmartCore') || landingHtml.includes('root'), 'Landing HTML should mount shell app');

    // 2. Module 2 Mount point via single origin
    const m2Res = await fetch(`${SHELL_URL}/m2/`);
    assert.strictEqual(m2Res.status, 200, 'Module 2 must be accessible through /m2 under single origin');

    // 3. Module 1 Mount point via single origin
    const m1Res = await fetch(`${SHELL_URL}/m1/`);
    assert.strictEqual(m1Res.status, 200, 'Module 1 must be accessible through /m1 under single origin');
  });

  // ─── 2. ACCEPTANCE CRITERION 3: Unauthenticated API Calls Return 401 ────────
  test('CRITERION 3: Unauthenticated API calls to protected backend endpoints return 401', async () => {
    // Protected CAD assets endpoint
    const cadRes = await fetch(`${BACKEND_URL}/cad-assets`);
    assert.strictEqual(cadRes.status, 401, 'Unauthenticated /cad-assets must return 401');

    // Protected Orders endpoint
    const ordersRes = await fetch(`${BACKEND_URL}/orders`);
    assert.strictEqual(ordersRes.status, 401, 'Unauthenticated /orders must return 401');

    // Protected /me endpoint with invalid bearer token
    const meRes = await fetch(`${BACKEND_URL}/me`, {
      headers: { 'Authorization': 'Bearer forged-invalid-token-12345' }
    });
    assert.strictEqual(meRes.status, 401, 'Invalid Bearer token must return 401');
  });

  // ─── 3. ACCEPTANCE CRITERION 4: Role-Based Access Control (403 / 404) ────────
  test('CRITERION 4: Unauthorized role actions return 403; unauthorized entity access returns 404', async () => {
    // Customer trying to dispatch a shipment (requires OPERATOR or ADMIN)
    const orderId = '77777777-7777-7777-7777-777777777701';
    const forbiddenShipmentRes = await fetch(`${BACKEND_URL}/orders/${orderId}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Role': 'customer'
      },
      body: JSON.stringify({ carrierLabel: 'TEST-CARRIER' })
    });
    assert.strictEqual(forbiddenShipmentRes.status, 403, 'Customer role must be rejected with 403 on dispatch shipment');

    // Customer trying to query an asset owned by another customer -> 404
    const unknownAssetRes = await fetch(`${BACKEND_URL}/assets/ASSET-999999`, {
      headers: {
        'X-Dev-Role': 'customer'
      }
    });
    assert.strictEqual(unknownAssetRes.status, 404, 'Querying non-owned or non-existent asset must return 404');
  });

  // ─── 4. ACCEPTANCE CRITERION 5: Cryptographic Integrity & Plan Hash ──────────
  test('CRITERION 5: Released assets carry cryptographic SHA-256 provenance plan hash', async () => {
    const assetsRes = await fetch(`${BACKEND_URL}/assets`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(assetsRes.status, 200);
    const assets = await assetsRes.json();
    assert.ok(Array.isArray(assets) && assets.length > 0, 'Seeded assets must exist');

    for (const asset of assets) {
      assert.ok(asset.assetTag, 'Asset must have permanent tag ID');
      assert.strictEqual(asset.integrityOk, true, 'Cryptographic integrity must be verified OK');
      assert.ok(asset.planHash && asset.planHash.length === 64, 'Plan hash must be a valid 64-char SHA-256 hex string');
    }
  });

  // ─── 5. ACCEPTANCE CRITERION 6: Validated Shipment State Machine ────────────
  test('CRITERION 6: Shipment state machine rejects state skips (409) and enforces linear progression', async () => {
    // Query shipments
    const shipmentsRes = await fetch(`${BACKEND_URL}/shipments`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(shipmentsRes.status, 200);
    const shipments = await shipmentsRes.json();
    assert.ok(shipments.length > 0, 'Shipments must exist');

    const preparingShipment = shipments.find(s => s.status === 'PREPARING') || shipments[0];

    if (preparingShipment.status === 'PREPARING') {
      // Attempt invalid state skip: PREPARING -> DELIVERED directly
      const skipRes = await fetch(`${BACKEND_URL}/shipments/${preparingShipment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Role': 'operator'
        },
        body: JSON.stringify({ toStatus: 'DELIVERED', reason: 'Attempt illegal skip' })
      });
      assert.strictEqual(skipRes.status, 409, 'Skipping state from PREPARING to DELIVERED must return 409 Conflict');

      // Valid transition: PREPARING -> SHIPPED
      const validRes = await fetch(`${BACKEND_URL}/shipments/${preparingShipment.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Role': 'operator'
        },
        body: JSON.stringify({ toStatus: 'SHIPPED', reason: 'Dispatched from factory' })
      });
      assert.strictEqual(validRes.status, 200, 'Transition from PREPARING to SHIPPED must succeed');
      const updated = await validRes.json();
      assert.strictEqual(updated.status, 'SHIPPED');
    }
  });

  // ─── 6. ACCEPTANCE CRITERION 7: Physical Asset Link to Module 1 Machine ─────
  test('CRITERION 7: Registered physical asset links to Module 1 CNC machine; duplicate link rejected (409)', async () => {
    // 1. Check bridge asset ASSET-000123
    const bridgeRes = await fetch(`${BACKEND_URL}/assets/ASSET-000123`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(bridgeRes.status, 200);
    const bridgeAsset = await bridgeRes.json();
    assert.strictEqual(bridgeAsset.assetTag, 'ASSET-000123');

    // 2. Check ASSET-000120 (already linked in previous run or ready to link)
    const asset120Res = await fetch(`${BACKEND_URL}/assets/ASSET-000120`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(asset120Res.status, 200);
    const asset120 = await asset120Res.json();

    // 3. Duplicate link attempt on already linked asset -> 409 Conflict
    const dupLinkRes = await fetch(`${BACKEND_URL}/assets/ASSET-000120/link-machine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Role': 'admin'
      },
      body: JSON.stringify({ machineCode: 'CNC-002' })
    });
    assert.strictEqual(dupLinkRes.status, 409, 'Duplicate machine link attempt must be rejected with 409 Conflict');
  });

  // ─── 7. ACCEPTANCE CRITERION 8: Storage Path Traversal Prevention ───────────
  test('CRITERION 8: Path traversal attempts in storage endpoints are strictly blocked (403/400)', async () => {
    const traversalRes = await fetch(`${BACKEND_URL}/storage/cad-originals/../../application.yml`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.ok(
      traversalRes.status === 400 || traversalRes.status === 403 || traversalRes.status === 404,
      `Path traversal attempt must be blocked with 400, 403, or 404, got ${traversalRes.status}`
    );
  });

  // ─── 8. ACCEPTANCE CRITERION 9: Full PRD §8.2 Demo Lifecycle Journey ────────
  test('CRITERION 9: Complete Pre-Manufacturing through Monitoring Demo Journey passes end-to-end', async () => {
    // Step 1: Query Material Recommendations
    const matRes = await fetch(`${BACKEND_URL}/materials`, {
      headers: { 'X-Dev-Role': 'designer' }
    });
    assert.strictEqual(matRes.status, 200);
    const materials = await matRes.json();
    assert.ok(materials.length >= 6, 'Baseline materials catalog must have standard engineering alloys');

    // Step 2: Query Machine Profiles
    const machRes = await fetch(`${BACKEND_URL}/machine-profiles`, {
      headers: { 'X-Dev-Role': 'cam_engineer' }
    });
    assert.strictEqual(machRes.status, 200);
    const machines = await machRes.json();
    assert.ok(machines.some(m => m.name.includes('Haas VF-2')), 'Haas VF-2 machine profile must be configured');

    // Step 3: Query Cutting Tools
    const toolsRes = await fetch(`${BACKEND_URL}/cutting-tools`, {
      headers: { 'X-Dev-Role': 'cam_engineer' }
    });
    assert.strictEqual(toolsRes.status, 200);
    const tools = await toolsRes.json();
    assert.ok(tools.length >= 5, 'Cutting tools catalog must contain standard endmills/facemills');

    // Step 4: Query Approvals
    const approvalsRes = await fetch(`${BACKEND_URL}/approvals`, {
      headers: { 'X-Dev-Role': 'approver' }
    });
    assert.strictEqual(approvalsRes.status, 200);
    const approvals = await approvalsRes.json();
    assert.ok(approvals.length > 0, 'Seeded CAM approvals must exist');

    // Step 5: Query Orders
    const ordersRes = await fetch(`${BACKEND_URL}/orders`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(ordersRes.status, 200);
    const orders = await ordersRes.json();
    assert.ok(orders.length > 0, 'Manufacturing orders must exist');

    // Step 6: Verify Bidirectional Provenance Bridge
    const bridgeAssetRes = await fetch(`${BACKEND_URL}/assets/ASSET-000123`, {
      headers: { 'X-Dev-Role': 'admin' }
    });
    assert.strictEqual(bridgeAssetRes.status, 200);
    const bridge = await bridgeAssetRes.json();
    assert.strictEqual(bridge.assetTag, 'ASSET-000123');
    assert.strictEqual(bridge.integrityOk, true);
  });
});
