package com.cncsmartcore.shipment;

import com.cncsmartcore.asset.Asset;
import com.cncsmartcore.asset.AssetRepository;
import com.cncsmartcore.asset.AssetStatus;
import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.order.ManufacturingOrder;
import com.cncsmartcore.order.OrderRepository;
import com.cncsmartcore.order.OrderStatus;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.shipment.dto.CreateShipmentRequest;
import com.cncsmartcore.shipment.dto.ShipmentEventDto;
import com.cncsmartcore.shipment.dto.ShipmentResponse;
import com.cncsmartcore.shipment.dto.TransitionShipmentRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.Year;
import java.util.*;

@Service
public class ShipmentService {

    private static final Logger log = LoggerFactory.getLogger(ShipmentService.class);

    private final ShipmentRepository shipmentRepository;
    private final ShipmentEventRepository shipmentEventRepository;
    private final OrderRepository orderRepository;
    private final AssetRepository assetRepository;
    private final AuditService auditService;

    public ShipmentService(
            ShipmentRepository shipmentRepository,
            ShipmentEventRepository shipmentEventRepository,
            OrderRepository orderRepository,
            AssetRepository assetRepository,
            AuditService auditService
    ) {
        this.shipmentRepository = shipmentRepository;
        this.shipmentEventRepository = shipmentEventRepository;
        this.orderRepository = orderRepository;
        this.assetRepository = assetRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ShipmentResponse createShipment(UUID orderId, CreateShipmentRequest request, CurrentUser currentUser) {
        ManufacturingOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));

        UUID actorId = currentUser != null ? currentUser.id() : UUID.fromString("00000000-0000-0000-0000-000000000001");
        String actorRole = currentUser != null ? currentUser.role() : "admin";

        // Role guard: Only operator or admin can create shipments
        if (currentUser != null && !"operator".equalsIgnoreCase(actorRole) && !"admin".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only operator or admin can dispatch shipments");
        }

        // Check if shipment already exists
        Optional<Shipment> existingOpt = shipmentRepository.findByOrderId(orderId);
        if (existingOpt.isPresent()) {
            return toResponse(existingOpt.get(), order.getOrderNo());
        }

        long count = shipmentRepository.count();
        String shipmentNo = String.format("SHP-%d-%04d", Year.now().getValue(), count + 1001);
        String trackingNo = (request != null && request.trackingNo() != null && !request.trackingNo().isBlank())
                ? request.trackingNo()
                : "TRK-DEMO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String carrier = (request != null && request.carrierLabel() != null && !request.carrierLabel().isBlank())
                ? request.carrierLabel()
                : "DEMO-CARRIER";

        Shipment shipment = new Shipment(
                UUID.randomUUID(),
                shipmentNo,
                order.getId(),
                ShipmentStatus.PREPARING,
                carrier,
                trackingNo
        );
        shipment = shipmentRepository.save(shipment);

        // Record initial event
        ShipmentEvent initialEvent = new ShipmentEvent(
                shipment.getId(),
                null,
                ShipmentStatus.PREPARING.name(),
                actorId,
                "Shipment package created in warehouse"
        );
        shipmentEventRepository.save(initialEvent);

        auditService.logEvent(actorId, actorRole, "SHIPMENT_CREATED", "SHIPMENT", shipment.getId(),
                Map.of("shipmentNo", shipment.getShipmentNo(), "orderNo", order.getOrderNo()), null);

        log.info("Shipment created: {} for Order {}", shipment.getShipmentNo(), order.getOrderNo());
        return toResponse(shipment, order.getOrderNo());
    }

    @Transactional
    public ShipmentResponse transitionShipment(UUID shipmentId, TransitionShipmentRequest request, CurrentUser currentUser) {
        if (request == null || request.toStatus() == null || request.toStatus().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "toStatus is required");
        }

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shipment not found: " + shipmentId));

        ManufacturingOrder order = orderRepository.findById(shipment.getOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Associated order not found"));

        UUID actorId = currentUser != null ? currentUser.id() : UUID.fromString("00000000-0000-0000-0000-000000000001");
        String actorRole = currentUser != null ? currentUser.role() : "admin";

        ShipmentStatus targetStatus;
        try {
            targetStatus = ShipmentStatus.valueOf(request.toStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shipment status: " + request.toStatus());
        }

        ShipmentStatus current = shipment.getStatus();

        // VALIDATED STATE MACHINE (ARCHITECTURE.md §6 & PRD Acceptance 6)
        // PREPARING -> SHIPPED
        // SHIPPED -> IN_TRANSIT
        // IN_TRANSIT -> DELIVERED or FAILED
        // FAILED -> PREPARING (retry)
        boolean validTransition = false;
        switch (current) {
            case PREPARING -> {
                if (targetStatus == ShipmentStatus.SHIPPED) {
                    if (currentUser != null && !"operator".equalsIgnoreCase(actorRole) && !"admin".equalsIgnoreCase(actorRole)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only operator or admin can mark shipment as SHIPPED");
                    }
                    validTransition = true;
                }
            }
            case SHIPPED -> {
                if (targetStatus == ShipmentStatus.IN_TRANSIT) {
                    if (currentUser != null && !"operator".equalsIgnoreCase(actorRole) && !"admin".equalsIgnoreCase(actorRole)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only operator or admin can mark shipment as IN_TRANSIT");
                    }
                    validTransition = true;
                }
            }
            case IN_TRANSIT -> {
                if (targetStatus == ShipmentStatus.DELIVERED) {
                    // Recipient or admin can confirm delivery
                    if (currentUser != null && !"admin".equalsIgnoreCase(actorRole)) {
                        if (!"customer".equalsIgnoreCase(actorRole) || !currentUser.id().equals(order.getRecipientId())) {
                            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the designated recipient customer or admin can confirm delivery");
                        }
                    }
                    validTransition = true;
                } else if (targetStatus == ShipmentStatus.FAILED) {
                    if (currentUser != null && !"operator".equalsIgnoreCase(actorRole) && !"admin".equalsIgnoreCase(actorRole)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only operator or admin can record delivery failure");
                    }
                    validTransition = true;
                }
            }
            case FAILED -> {
                if (targetStatus == ShipmentStatus.PREPARING) {
                    if (currentUser != null && !"operator".equalsIgnoreCase(actorRole) && !"admin".equalsIgnoreCase(actorRole)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only operator or admin can retry failed shipment");
                    }
                    validTransition = true;
                }
            }
            case DELIVERED -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Shipment has already been DELIVERED. Terminal state reached.");
            }
        }

        if (!validTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    String.format("Invalid shipment state transition: cannot jump from %s to %s (skipping intermediate states is forbidden)", current, targetStatus));
        }

        // Apply state transition
        shipment.setStatus(targetStatus);
        shipment.setUpdatedAt(Instant.now());
        shipmentRepository.save(shipment);

        // Propagate status to order and physical assets
        if (targetStatus == ShipmentStatus.SHIPPED) {
            order.setStatus(OrderStatus.SHIPPING);
            order.setUpdatedAt(Instant.now());
            orderRepository.save(order);

            List<Asset> assets = assetRepository.findByOrderId(order.getId());
            for (Asset a : assets) {
                a.setStatus(AssetStatus.IN_SHIPMENT);
                a.setUpdatedAt(Instant.now());
                assetRepository.save(a);
            }
        } else if (targetStatus == ShipmentStatus.DELIVERED) {
            order.setStatus(OrderStatus.DELIVERED);
            order.setUpdatedAt(Instant.now());
            orderRepository.save(order);

            List<Asset> assets = assetRepository.findByOrderId(order.getId());
            for (Asset a : assets) {
                a.setStatus(AssetStatus.DELIVERED);
                a.setUpdatedAt(Instant.now());
                assetRepository.save(a);
            }
        }

        // Record history event
        ShipmentEvent event = new ShipmentEvent(
                shipment.getId(),
                current.name(),
                targetStatus.name(),
                actorId,
                request.note() != null ? request.note() : ("Shipment transitioned to " + targetStatus.name())
        );
        shipmentEventRepository.save(event);

        // Write immutable audit log
        auditService.logEvent(actorId, actorRole, "SHIPMENT_TRANSITION", "SHIPMENT", shipment.getId(),
                Map.of("from", current.name(), "to", targetStatus.name(), "orderNo", order.getOrderNo()), null);

        log.info("Shipment {} transitioned from {} to {}", shipment.getShipmentNo(), current, targetStatus);
        return toResponse(shipment, order.getOrderNo());
    }

    @Transactional
    public ShipmentResponse confirmDelivery(UUID shipmentId, CurrentUser currentUser) {
        return transitionShipment(shipmentId, new TransitionShipmentRequest(ShipmentStatus.DELIVERED.name(), "Delivery confirmed by recipient customer"), currentUser);
    }

    @Transactional(readOnly = true)
    public List<ShipmentResponse> getShipments(CurrentUser currentUser) {
        List<Shipment> shipments = shipmentRepository.findAllByOrderByCreatedAtDesc();
        return shipments.stream().map(s -> {
            Optional<ManufacturingOrder> order = orderRepository.findById(s.getOrderId());
            String orderNo = order.map(ManufacturingOrder::getOrderNo).orElse("N/A");
            return toResponse(s, orderNo);
        }).toList();
    }

    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentById(UUID id, CurrentUser currentUser) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shipment not found: " + id));

        Optional<ManufacturingOrder> order = orderRepository.findById(shipment.getOrderId());
        String orderNo = order.map(ManufacturingOrder::getOrderNo).orElse("N/A");

        if (currentUser != null && "customer".equalsIgnoreCase(currentUser.role())) {
            if (order.isPresent() && !currentUser.id().equals(order.get().getRecipientId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shipment not found: " + id);
            }
        }

        return toResponse(shipment, orderNo);
    }

    private ShipmentResponse toResponse(Shipment s, String orderNo) {
        List<ShipmentEventDto> events = shipmentEventRepository.findByShipmentIdOrderByCreatedAtAsc(s.getId())
                .stream()
                .map(e -> new ShipmentEventDto(
                        e.getId(),
                        e.getShipmentId(),
                        e.getFromStatus(),
                        e.getToStatus(),
                        e.getActorId(),
                        e.getNote(),
                        e.getCreatedAt()
                ))
                .toList();

        return new ShipmentResponse(
                s.getId(),
                s.getShipmentNo(),
                s.getOrderId(),
                orderNo,
                s.getStatus(),
                s.getCarrierLabel(),
                s.getTrackingNo(),
                s.getCreatedAt(),
                s.getUpdatedAt(),
                events
        );
    }
}
