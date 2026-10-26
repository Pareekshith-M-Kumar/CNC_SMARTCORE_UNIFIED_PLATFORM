package com.cncsmartcore.order;

import com.cncsmartcore.approval.ManufacturingApproval;
import com.cncsmartcore.approval.ManufacturingApprovalRepository;
import com.cncsmartcore.asset.Asset;
import com.cncsmartcore.asset.AssetRepository;
import com.cncsmartcore.asset.AssetStatus;
import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.order.dto.CreateOrderRequest;
import com.cncsmartcore.order.dto.OrderResponse;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.*;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ManufacturingApprovalRepository approvalRepository;
    private final AssetRepository assetRepository;
    private final ProfileRepository profileRepository;
    private final AuditService auditService;

    public OrderService(
            OrderRepository orderRepository,
            ManufacturingApprovalRepository approvalRepository,
            AssetRepository assetRepository,
            ProfileRepository profileRepository,
            AuditService auditService
    ) {
        this.orderRepository = orderRepository;
        this.approvalRepository = approvalRepository;
        this.assetRepository = assetRepository;
        this.profileRepository = profileRepository;
        this.auditService = auditService;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, CurrentUser currentUser) {
        if (request.approvalId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "approvalId is required");
        }

        UUID actorId = currentUser != null ? currentUser.id() : UUID.fromString("00000000-0000-0000-0000-000000000001");
        String actorRole = currentUser != null ? currentUser.role() : "admin";

        // Role check: Only approver, cam_engineer, or admin can create orders
        if (currentUser != null && !"admin".equalsIgnoreCase(actorRole)
                && !"approver".equalsIgnoreCase(actorRole)
                && !"cam_engineer".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions to create manufacturing order");
        }

        // 1. Approval Guard
        ManufacturingApproval approval = approvalRepository.findById(request.approvalId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Approval not found: " + request.approvalId()));

        if (!"APPROVED".equalsIgnoreCase(approval.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Precondition Failed: Manufacturing approval must be APPROVED. Current status is " + approval.getStatus());
        }

        // 2. Integrity Verification Guard (Rule 8 / PRD Acceptance 5)
        if (approval.getPlanHash() == null || approval.getPlanHash().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Integrity Violation: Approval has no valid SHA-256 plan hash");
        }
        if (Boolean.FALSE.equals(approval.getIntegrityVerified())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Integrity Violation: Stored CAD artifact integrity check previously failed");
        }

        // 3. Duplicate Order Check
        Optional<ManufacturingOrder> existingOpt = orderRepository.findByApprovalId(approval.getId());
        if (existingOpt.isPresent() && existingOpt.get().getStatus() != OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An active manufacturing order already exists for this approval: " + existingOpt.get().getOrderNo());
        }

        int qty = (request.quantity() != null && request.quantity() > 0) ? request.quantity() : 1;
        UUID recipientId = request.recipientId() != null ? request.recipientId() : actorId;

        // Generate Order Number
        long count = orderRepository.count();
        String orderNo = String.format("MO-%d-%04d", Year.now().getValue(), count + 1001);

        ManufacturingOrder order = new ManufacturingOrder(
                UUID.randomUUID(),
                orderNo,
                approval.getId(),
                approval.getPlanHash(),
                qty,
                OrderStatus.CREATED,
                recipientId,
                actorId
        );
        order = orderRepository.save(order);

        // Auto-generate N serialized physical assets (ASSET-XXXXXX)
        long assetCount = assetRepository.count();
        List<String> assetTags = new ArrayList<>();
        for (int i = 1; i <= qty; i++) {
            String assetTag = String.format("ASSET-%06d", assetCount + 1000 + i);
            Asset asset = new Asset(
                    UUID.randomUUID(),
                    assetTag,
                    order.getId(),
                    "cnc_machine",
                    AssetStatus.MANUFACTURED,
                    recipientId,
                    "SN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
            );
            assetRepository.save(asset);
            assetTags.add(assetTag);
        }

        // Audit Event
        Map<String, Object> details = new HashMap<>();
        details.put("orderNo", order.getOrderNo());
        details.put("approvalId", approval.getId().toString());
        details.put("planHash", order.getPlanHash());
        details.put("quantity", qty);
        details.put("assetTags", assetTags);
        auditService.logEvent(actorId, actorRole, "ORDER_CREATED", "MANUFACTURING_ORDER", order.getId(), details, null);

        log.info("Manufacturing Order created: {} with {} assets for approval {}", order.getOrderNo(), qty, approval.getId());
        return toResponse(order, assetTags);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(CurrentUser currentUser) {
        List<ManufacturingOrder> orders;
        if (currentUser != null && "customer".equalsIgnoreCase(currentUser.role())) {
            orders = orderRepository.findByRecipientIdOrderByCreatedAtDesc(currentUser.id());
        } else {
            orders = orderRepository.findAllByOrderByCreatedAtDesc();
        }

        return orders.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(UUID id, CurrentUser currentUser) {
        ManufacturingOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturing order not found: " + id));

        if (currentUser != null && "customer".equalsIgnoreCase(currentUser.role())
                && !currentUser.id().equals(order.getRecipientId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturing order not found: " + id);
        }

        return toResponse(order);
    }

    private OrderResponse toResponse(ManufacturingOrder order) {
        List<String> assetTags = assetRepository.findByOrderId(order.getId())
                .stream().map(Asset::getAssetTag).toList();
        return toResponse(order, assetTags);
    }

    private OrderResponse toResponse(ManufacturingOrder order, List<String> assetTags) {
        String recipientName = "Customer";
        if (order.getRecipientId() != null) {
            Optional<Profile> p = profileRepository.findById(order.getRecipientId());
            if (p.isPresent() && p.get().getFullName() != null) {
                recipientName = p.get().getFullName();
            }
        }

        return new OrderResponse(
                order.getId(),
                order.getOrderNo(),
                order.getApprovalId(),
                order.getPlanHash(),
                order.getQuantity(),
                order.getStatus(),
                order.getRecipientId(),
                recipientName,
                order.getCreatedBy(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                assetTags
        );
    }
}
