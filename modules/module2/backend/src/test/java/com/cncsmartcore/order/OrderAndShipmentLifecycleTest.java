package com.cncsmartcore.order;

import com.cncsmartcore.approval.ManufacturingApproval;
import com.cncsmartcore.approval.ManufacturingApprovalRepository;
import com.cncsmartcore.asset.Asset;
import com.cncsmartcore.asset.AssetRepository;
import com.cncsmartcore.asset.AssetStatus;
import com.cncsmartcore.order.dto.CreateOrderRequest;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.shipment.Shipment;
import com.cncsmartcore.shipment.ShipmentRepository;
import com.cncsmartcore.shipment.ShipmentStatus;
import com.cncsmartcore.shipment.dto.CreateShipmentRequest;
import com.cncsmartcore.shipment.dto.TransitionShipmentRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderAndShipmentLifecycleTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ManufacturingApprovalRepository approvalRepository;

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID approverId;
    private UUID operatorId;
    private UUID customerId;
    private ManufacturingApproval approvedApproval;
    private ManufacturingApproval pendingApproval;

    @BeforeEach
    void setUp() {
        approverId = UUID.randomUUID();
        operatorId = UUID.randomUUID();
        customerId = UUID.randomUUID();

        profileRepository.save(new Profile(approverId, "approver@cnc.com", "Senior Approver", "approver", true));
        profileRepository.save(new Profile(operatorId, "operator@cnc.com", "CNC Operator", "operator", true));
        profileRepository.save(new Profile(customerId, "customer@cnc.com", "Customer One", "customer", true));

        // Approved approval
        approvedApproval = new ManufacturingApproval();
        approvedApproval.setId(UUID.randomUUID());
        approvedApproval.setCamJobId(UUID.randomUUID());
        approvedApproval.setCadVersionId(UUID.randomUUID());
        approvedApproval.setSimulationId(UUID.randomUUID());
        approvedApproval.setStatus("APPROVED");
        approvedApproval.setSubmittedBy(operatorId);
        approvedApproval.setSubmittedAt(Instant.now());
        approvedApproval.setDecidedBy(approverId);
        approvedApproval.setDecidedAt(Instant.now());
        approvedApproval.setIntegrityVerified(true);
        approvedApproval.setPlanHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        approvedApproval = approvalRepository.save(approvedApproval);

        // Pending approval
        pendingApproval = new ManufacturingApproval();
        pendingApproval.setId(UUID.randomUUID());
        pendingApproval.setCamJobId(UUID.randomUUID());
        pendingApproval.setCadVersionId(UUID.randomUUID());
        pendingApproval.setSimulationId(UUID.randomUUID());
        pendingApproval.setStatus("PENDING");
        pendingApproval.setSubmittedBy(operatorId);
        pendingApproval.setSubmittedAt(Instant.now());
        pendingApproval.setIntegrityVerified(true);
        pendingApproval.setPlanHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        pendingApproval = approvalRepository.save(pendingApproval);
    }

    @Test
    @DisplayName("POST /orders creates order and assets from APPROVED plan; rejects PENDING with 409")
    void testOrderCreationLifecycle() throws Exception {
        // 1. Rejects PENDING approval with 409 Conflict
        CreateOrderRequest pendingReq = new CreateOrderRequest(pendingApproval.getId(), 2, customerId);
        mockMvc.perform(post("/api/v1/orders")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pendingReq)))
                .andExpect(status().isConflict());

        // 2. Succeeds for APPROVED plan
        CreateOrderRequest validReq = new CreateOrderRequest(approvedApproval.getId(), 2, customerId);
        String responseJson = mockMvc.perform(post("/api/v1/orders")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNo").exists())
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.assetTags.length()").value(2))
                .andReturn().getResponse().getContentAsString();

        // 3. Confirm physical assets exist in DB
        List<Asset> assets = assetRepository.findAll();
        assertFalse(assets.isEmpty());
        assertTrue(assets.stream().anyMatch(a -> a.getAssetTag().startsWith("ASSET-")));
    }

    @Test
    @DisplayName("Shipment state machine: PREPARING -> SHIPPED -> IN_TRANSIT -> DELIVERED; rejects skip")
    void testShipmentStateMachineAndAssetRegistration() throws Exception {
        // 1. Create order
        CreateOrderRequest validReq = new CreateOrderRequest(approvedApproval.getId(), 1, customerId);
        String orderRes = mockMvc.perform(post("/api/v1/orders")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID orderId = UUID.fromString(objectMapper.readTree(orderRes).get("id").asText());
        String assetTag = objectMapper.readTree(orderRes).get("assetTags").get(0).asText();

        // 2. Create shipment in PREPARING
        CreateShipmentRequest shipReq = new CreateShipmentRequest("TEST-EXPRESS", "TRK-9999");
        String shipRes = mockMvc.perform(post("/api/v1/orders/" + orderId + "/shipments")
                        .with(jwt().jwt(j -> j.subject(operatorId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shipReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PREPARING"))
                .andReturn().getResponse().getContentAsString();

        UUID shipmentId = UUID.fromString(objectMapper.readTree(shipRes).get("id").asText());

        // 3. Skipping state (PREPARING -> DELIVERED) MUST be rejected with 409 CONFLICT
        TransitionShipmentRequest skipReq = new TransitionShipmentRequest("DELIVERED", "Skipping states should fail");
        mockMvc.perform(post("/api/v1/shipments/" + shipmentId + "/transition")
                        .with(jwt().jwt(j -> j.subject(operatorId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(skipReq)))
                .andExpect(status().isConflict());

        // 4. Valid step: PREPARING -> SHIPPED
        TransitionShipmentRequest shipTransition = new TransitionShipmentRequest("SHIPPED", "Loaded onto truck");
        mockMvc.perform(post("/api/v1/shipments/" + shipmentId + "/transition")
                        .with(jwt().jwt(j -> j.subject(operatorId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shipTransition)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));

        // 5. Valid step: SHIPPED -> IN_TRANSIT
        TransitionShipmentRequest transitTransition = new TransitionShipmentRequest("IN_TRANSIT", "In flight");
        mockMvc.perform(post("/api/v1/shipments/" + shipmentId + "/transition")
                        .with(jwt().jwt(j -> j.subject(operatorId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_OPERATOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transitTransition)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"));

        // 6. Valid step: IN_TRANSIT -> DELIVERED via confirm-delivery
        mockMvc.perform(post("/api/v1/shipments/" + shipmentId + "/confirm-delivery")
                        .with(jwt().jwt(j -> j.subject(customerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        // 7. Verify asset status is now DELIVERED
        Asset deliveredAsset = assetRepository.findByAssetTag(assetTag).orElseThrow();
        assertEquals(AssetStatus.DELIVERED, deliveredAsset.getStatus());

        // 8. Register delivered asset (DELIVERED -> REGISTERED)
        mockMvc.perform(post("/api/v1/assets/" + assetTag + "/register")
                        .with(jwt().jwt(j -> j.subject(customerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REGISTERED"))
                .andExpect(jsonPath("$.registered").value(true));

        // 9. Second registration must reject with 409 CONFLICT (PRD Acceptance 7)
        mockMvc.perform(post("/api/v1/assets/" + assetTag + "/register")
                        .with(jwt().jwt(j -> j.subject(customerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());

        // 10. Milestone 8: Customer attempting to link machine rejects with 403 FORBIDDEN
        com.cncsmartcore.asset.dto.LinkMachineRequest linkReq = new com.cncsmartcore.asset.dto.LinkMachineRequest("CNC-001", "Haas VF-2", "LINE-A");
        mockMvc.perform(post("/api/v1/assets/" + assetTag + "/link-machine")
                        .with(jwt().jwt(j -> j.subject(customerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(linkReq)))
                .andExpect(status().isForbidden());

        // 11. Milestone 8: Admin linking registered asset to machine CNC-001 succeeds (REGISTERED -> VERIFIED)
        mockMvc.perform(post("/api/v1/assets/" + assetTag + "/link-machine")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(linkReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"))
                .andExpect(jsonPath("$.machineCode").value("CNC-001"))
                .andExpect(jsonPath("$.machineLinked").value(true));

        // 12. Milestone 8: Second link of the same asset rejects with 409 CONFLICT
        mockMvc.perform(post("/api/v1/assets/" + assetTag + "/link-machine")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(linkReq)))
                .andExpect(status().isConflict());
    }
}
