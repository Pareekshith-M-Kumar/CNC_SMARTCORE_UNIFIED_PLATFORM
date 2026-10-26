package com.cncsmartcore.order;

import com.cncsmartcore.order.dto.CreateOrderRequest;
import com.cncsmartcore.order.dto.OrderResponse;
import com.cncsmartcore.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('APPROVER', 'CAM_ENGINEER', 'ADMIN')")
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        OrderResponse response = orderService.createOrder(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderResponse>> getOrders(
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(orderService.getOrders(currentUser));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> getOrderById(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(orderService.getOrderById(id, currentUser));
    }
}
