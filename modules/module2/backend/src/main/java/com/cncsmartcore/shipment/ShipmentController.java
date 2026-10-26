package com.cncsmartcore.shipment;

import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.shipment.dto.CreateShipmentRequest;
import com.cncsmartcore.shipment.dto.ShipmentResponse;
import com.cncsmartcore.shipment.dto.TransitionShipmentRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @PostMapping("/orders/{orderId}/shipments")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN')")
    public ResponseEntity<ShipmentResponse> createShipment(
            @PathVariable UUID orderId,
            @RequestBody(required = false) CreateShipmentRequest request,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        ShipmentResponse response = shipmentService.createShipment(orderId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/shipments/{id}/transition")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShipmentResponse> transitionShipment(
            @PathVariable UUID id,
            @RequestBody TransitionShipmentRequest request,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        ShipmentResponse response = shipmentService.transitionShipment(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/shipments/{id}/confirm-delivery")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShipmentResponse> confirmDelivery(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        ShipmentResponse response = shipmentService.confirmDelivery(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/shipments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ShipmentResponse>> getShipments(
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(shipmentService.getShipments(currentUser));
    }

    @GetMapping("/shipments/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShipmentResponse> getShipmentById(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(shipmentService.getShipmentById(id, currentUser));
    }
}
