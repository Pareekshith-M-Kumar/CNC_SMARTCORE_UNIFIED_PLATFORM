package com.cncsmartcore.asset;

import com.cncsmartcore.asset.dto.AssetResponse;
import com.cncsmartcore.asset.dto.RegisterAssetRequest;
import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.order.ManufacturingOrder;
import com.cncsmartcore.order.OrderRepository;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service
public class AssetService {

    private static final Logger log = LoggerFactory.getLogger(AssetService.class);

    private final AssetRepository assetRepository;
    private final AssetRegistrationRepository registrationRepository;
    private final OrderRepository orderRepository;
    private final ProfileRepository profileRepository;
    private final AuditService auditService;

    public AssetService(
            AssetRepository assetRepository,
            AssetRegistrationRepository registrationRepository,
            OrderRepository orderRepository,
            ProfileRepository profileRepository,
            AuditService auditService
    ) {
        this.assetRepository = assetRepository;
        this.registrationRepository = registrationRepository;
        this.orderRepository = orderRepository;
        this.profileRepository = profileRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssets(CurrentUser currentUser) {
        List<Asset> assets;
        if (currentUser != null && "customer".equalsIgnoreCase(currentUser.role())) {
            assets = assetRepository.findByOwnerId(currentUser.id());
        } else {
            assets = assetRepository.findAllByOrderByCreatedAtDesc();
        }
        return assets.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AssetResponse getAssetByTag(String assetTag, CurrentUser currentUser) {
        Asset asset = assetRepository.findByAssetTag(assetTag)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found with tag: " + assetTag));

        if (currentUser != null && "customer".equalsIgnoreCase(currentUser.role())
                && !currentUser.id().equals(asset.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found with tag: " + assetTag);
        }

        return toResponse(asset);
    }

    @Transactional
    public AssetResponse registerAsset(String assetTag, RegisterAssetRequest request, CurrentUser currentUser) {
        Asset asset = assetRepository.findByAssetTag(assetTag)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found with tag: " + assetTag));

        UUID actorId = currentUser != null ? currentUser.id() : UUID.fromString("00000000-0000-0000-0000-000000000001");
        String actorRole = currentUser != null ? currentUser.role() : "admin";

        // Guard 1: Ownership / role check
        if (currentUser != null && !"admin".equalsIgnoreCase(actorRole)) {
            if (!actorId.equals(asset.getOwnerId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the designated asset owner or admin can register this physical asset");
            }
        }

        // Guard 2: Status check (ARCHITECTURE.md §6: Asset DELIVERED → REGISTERED)
        if (asset.getStatus() == AssetStatus.REGISTERED || asset.getStatus() == AssetStatus.VERIFIED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Asset is already REGISTERED: " + assetTag);
        }
        if (asset.getStatus() != AssetStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Precondition Failed: Asset must be in DELIVERED status before customer registration. Current status: " + asset.getStatus());
        }

        // Apply state transition
        asset.setStatus(AssetStatus.REGISTERED);
        asset.setUpdatedAt(Instant.now());
        asset = assetRepository.save(asset);

        // Record permanent registration event
        AssetRegistration registration = new AssetRegistration(asset.getId(), actorId, true);
        registrationRepository.save(registration);

        // Audit Event
        auditService.logEvent(actorId, actorRole, "ASSET_REGISTERED", "PHYSICAL_ASSET", asset.getId(),
                Map.of("assetTag", asset.getAssetTag(), "orderId", asset.getOrderId().toString()), null);

        log.info("Physical Asset {} successfully registered by {}", asset.getAssetTag(), actorId);
        return toResponse(asset);
    }

    @Transactional
    public AssetResponse linkMachine(String assetTag, com.cncsmartcore.asset.dto.LinkMachineRequest request, CurrentUser currentUser) {
        Asset asset = assetRepository.findByAssetTag(assetTag)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Asset not found with tag: " + assetTag));

        UUID actorId = currentUser != null ? currentUser.id() : UUID.fromString("00000000-0000-0000-0000-000000000001");
        String actorRole = currentUser != null ? currentUser.role() : "admin";

        // Role guard: Admin or Approver can link physical machine (ARCHITECTURE.md §6)
        if (currentUser != null && !"admin".equalsIgnoreCase(actorRole) && !"approver".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin or authorized personnel can link asset to physical machine");
        }

        // Guard: Asset must be DELIVERED or REGISTERED or VERIFIED
        if (asset.getStatus() == AssetStatus.MANUFACTURED || asset.getStatus() == AssetStatus.IN_SHIPMENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Precondition Failed: Asset must be DELIVERED or REGISTERED before linking to physical CNC machine. Current: " + asset.getStatus());
        }

        // Guard: Second link to an already linked asset must fail (PRD Acceptance 7: "a second link fails")
        if (asset.getStatus() == AssetStatus.VERIFIED && asset.getMachineCode() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Asset is already linked to physical machine: " + asset.getMachineCode());
        }

        String targetMachine = (request != null && request.machineCode() != null && !request.machineCode().isBlank())
                ? request.machineCode().trim()
                : "CNC-001";

        asset.setStatus(AssetStatus.VERIFIED);
        asset.setMachineCode(targetMachine);
        asset.setUpdatedAt(Instant.now());
        asset = assetRepository.save(asset);

        // Audit Event
        auditService.logEvent(actorId, actorRole, "MACHINE_LINKED", "PHYSICAL_ASSET", asset.getId(),
                Map.of("assetTag", asset.getAssetTag(), "machineCode", targetMachine), null);

        log.info("Physical Asset {} linked to Module 1 CNC Machine {}", asset.getAssetTag(), targetMachine);
        return toResponse(asset);
    }

    private AssetResponse toResponse(Asset asset) {
        Optional<ManufacturingOrder> order = orderRepository.findById(asset.getOrderId());
        String orderNo = order.map(ManufacturingOrder::getOrderNo).orElse("N/A");
        String planHash = order.map(ManufacturingOrder::getPlanHash).orElse("N/A");

        String ownerName = "Customer";
        if (asset.getOwnerId() != null) {
            Optional<Profile> p = profileRepository.findById(asset.getOwnerId());
            if (p.isPresent() && p.get().getFullName() != null) {
                ownerName = p.get().getFullName();
            }
        }

        Optional<AssetRegistration> reg = registrationRepository.findFirstByAssetIdOrderByCreatedAtDesc(asset.getId());
        boolean registered = reg.isPresent() || asset.getStatus() == AssetStatus.REGISTERED || asset.getStatus() == AssetStatus.VERIFIED;
        Instant registeredAt = reg.map(AssetRegistration::getCreatedAt).orElse(asset.getUpdatedAt());
        boolean integrityOk = reg.map(AssetRegistration::getIntegrityOk).orElse(true);

        return new AssetResponse(
                asset.getId(),
                asset.getAssetTag(),
                asset.getOrderId(),
                orderNo,
                asset.getAssetKind(),
                asset.getStatus(),
                asset.getOwnerId(),
                ownerName,
                asset.getSerialNo(),
                registered,
                registeredAt,
                integrityOk,
                planHash,
                asset.getMachineCode(),
                asset.getMachineCode() != null || asset.getStatus() == AssetStatus.VERIFIED,
                asset.getCreatedAt(),
                asset.getUpdatedAt()
        );
    }
}
