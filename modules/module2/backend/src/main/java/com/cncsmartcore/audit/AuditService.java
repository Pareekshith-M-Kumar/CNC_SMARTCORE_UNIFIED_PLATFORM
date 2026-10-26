package com.cncsmartcore.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEventRepository auditEventRepository, ObjectMapper objectMapper) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditEvent logEvent(UUID actorId, String actorRole, String action, String entityType, UUID entityId, Map<String, Object> details, String requestId) {
        String detailsJson = null;
        if (details != null && !details.isEmpty()) {
            try {
                detailsJson = objectMapper.writeValueAsString(details);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize audit event details to JSON: {}", e.getMessage());
                detailsJson = "{}";
            }
        }

        AuditEvent event = new AuditEvent(actorId, actorRole, action, entityType, entityId, detailsJson, requestId);
        log.info("AUDIT EVENT: action={}, actorId={}, entityType={}, entityId={}", action, actorId, entityType, entityId);
        return auditEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> getRecentEvents(int limit) {
        return auditEventRepository.findAllByOrderByOccurredAtDesc(PageRequest.of(0, Math.min(limit, 100)));
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> getEventsForEntity(String entityType, UUID entityId) {
        return auditEventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId);
    }
}
