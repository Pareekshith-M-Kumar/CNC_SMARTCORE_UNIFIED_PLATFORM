package com.cncsmartcore.order;

import com.cncsmartcore.approval.ManufacturingApproval;
import com.cncsmartcore.approval.ManufacturingApprovalRepository;
import com.cncsmartcore.asset.Asset;
import com.cncsmartcore.asset.AssetRegistration;
import com.cncsmartcore.asset.AssetRegistrationRepository;
import com.cncsmartcore.asset.AssetRepository;
import com.cncsmartcore.asset.AssetStatus;
import com.cncsmartcore.shipment.Shipment;
import com.cncsmartcore.shipment.ShipmentEvent;
import com.cncsmartcore.shipment.ShipmentEventRepository;
import com.cncsmartcore.shipment.ShipmentRepository;
import com.cncsmartcore.shipment.ShipmentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@Order(50)
public class OrderDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(OrderDataInitializer.class);

    private final OrderRepository orderRepository;
    private final ManufacturingApprovalRepository approvalRepository;
    private final AssetRepository assetRepository;
    private final AssetRegistrationRepository registrationRepository;
    private final ShipmentRepository shipmentRepository;
    private final ShipmentEventRepository shipmentEventRepository;

    public OrderDataInitializer(
            OrderRepository orderRepository,
            ManufacturingApprovalRepository approvalRepository,
            AssetRepository assetRepository,
            AssetRegistrationRepository registrationRepository,
            ShipmentRepository shipmentRepository,
            ShipmentEventRepository shipmentEventRepository
    ) {
        this.orderRepository = orderRepository;
        this.approvalRepository = approvalRepository;
        this.assetRepository = assetRepository;
        this.registrationRepository = registrationRepository;
        this.shipmentRepository = shipmentRepository;
        this.shipmentEventRepository = shipmentEventRepository;
    }

    @Override
    public void run(String... args) {
        if (orderRepository.count() > 0) return;

        log.info("Seeding baseline manufacturing orders, demo shipments, and serialized assets...");

        UUID adminId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID camJobId = UUID.fromString("44444444-4444-4444-4444-444444444401");
        UUID cadVersionId = UUID.fromString("11111111-1111-1111-1111-111111111102");
        UUID simId = UUID.fromString("55555555-5555-5555-5555-555555555501");

        // 1. Seed Approved Manufacturing Approval
        UUID approvalId = UUID.fromString("66666666-6666-6666-6666-666666666601");
        ManufacturingApproval approval = new ManufacturingApproval();
        approval.setId(approvalId);
        approval.setCamJobId(camJobId);
        approval.setCadVersionId(cadVersionId);
        approval.setSimulationId(simId);
        approval.setStatus("APPROVED");
        approval.setSubmittedBy(adminId);
        approval.setSubmittedAt(Instant.now().minusSeconds(86400));
        approval.setDecidedBy(adminId);
        approval.setDecidedAt(Instant.now().minusSeconds(82800));
        approval.setDecisionComment("Plan validated and approved for CNC 3-Axis production. Speeds and feeds match empirical benchmark.");
        approval.setIntegrityVerified(true);
        approval.setIntegrityCheckedAt(Instant.now().minusSeconds(82800));
        approval.setPlanHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        approvalRepository.save(approval);

        // 2. Seed Manufacturing Order
        UUID orderId = UUID.fromString("77777777-7777-7777-7777-777777777701");
        ManufacturingOrder order = new ManufacturingOrder(
                orderId,
                "MO-2026-1001",
                approvalId,
                approval.getPlanHash(),
                2,
                OrderStatus.IN_PRODUCTION,
                adminId,
                adminId
        );
        orderRepository.save(order);

        // 3. Seed Physical Assets (including ASSET-000123 as the permanent bridge ID)
        Asset asset1 = new Asset(
                UUID.fromString("88888888-8888-8888-8888-888888888801"),
                "ASSET-000123",
                orderId,
                "cnc_machine",
                AssetStatus.VERIFIED,
                adminId,
                "SN-CNC-PRO-0123"
        );
        asset1.linkToMachine("CNC-001");
        assetRepository.save(asset1);

        AssetRegistration reg1 = new AssetRegistration(
                asset1.getId(),
                adminId,
                true
        );
        registrationRepository.save(reg1);

        Asset asset2 = new Asset(
                UUID.fromString("88888888-8888-8888-8888-888888888802"),
                "ASSET-000124",
                orderId,
                "cnc_machine",
                AssetStatus.DELIVERED,
                adminId,
                "SN-CNC-PRO-0124"
        );
        assetRepository.save(asset2);

        // 4. Seed Demo Shipment for Order MO-2026-1001
        UUID shipmentId = UUID.fromString("99999999-9999-9999-9999-999999999901");
        Shipment shipment = new Shipment(
                shipmentId,
                "SHP-2026-1001",
                orderId,
                ShipmentStatus.PREPARING,
                "DEMO-CARRIER",
                "TRK-DEMO-78491023"
        );
        shipmentRepository.save(shipment);

        ShipmentEvent event1 = new ShipmentEvent(
                shipmentId,
                null,
                "PREPARING",
                adminId,
                "Manufacturing plan released; shipment packaging initiated in demo warehouse"
        );
        shipmentEventRepository.save(event1);

        // 5. Seed a Delivered & Registered Asset for Instant Demo Bridge
        UUID order2Id = UUID.fromString("77777777-7777-7777-7777-777777777702");
        ManufacturingOrder order2 = new ManufacturingOrder(
                order2Id,
                "MO-2026-1000",
                approvalId,
                approval.getPlanHash(),
                1,
                OrderStatus.DELIVERED,
                adminId,
                adminId
        );
        orderRepository.save(order2);

        Asset deliveredAsset = new Asset(
                UUID.fromString("88888888-8888-8888-8888-888888888803"),
                "ASSET-000120",
                order2Id,
                "cnc_machine",
                AssetStatus.REGISTERED,
                adminId,
                "SN-CNC-PRO-0120"
        );
        assetRepository.save(deliveredAsset);

        AssetRegistration registration = new AssetRegistration(
                deliveredAsset.getId(),
                adminId,
                true
        );
        registrationRepository.save(registration);

        UUID shipment2Id = UUID.fromString("99999999-9999-9999-9999-999999999902");
        Shipment shipment2 = new Shipment(
                shipment2Id,
                "SHP-2026-1000",
                order2Id,
                ShipmentStatus.DELIVERED,
                "DEMO-CARRIER",
                "TRK-DEMO-65123901"
        );
        shipmentRepository.save(shipment2);

        shipmentEventRepository.save(new ShipmentEvent(shipment2Id, null, "PREPARING", adminId, "Created"));
        shipmentEventRepository.save(new ShipmentEvent(shipment2Id, "PREPARING", "SHIPPED", adminId, "Dispatched"));
        shipmentEventRepository.save(new ShipmentEvent(shipment2Id, "SHIPPED", "IN_TRANSIT", adminId, "In transit"));
        shipmentEventRepository.save(new ShipmentEvent(shipment2Id, "IN_TRANSIT", "DELIVERED", adminId, "Delivery confirmed by customer"));

        log.info("Successfully seeded manufacturing orders, demo shipments, and assets (including bridge asset ASSET-000123).");
    }
}
