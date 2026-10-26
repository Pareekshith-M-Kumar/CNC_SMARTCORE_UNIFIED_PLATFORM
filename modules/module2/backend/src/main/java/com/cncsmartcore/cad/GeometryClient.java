package com.cncsmartcore.cad;

import com.cncsmartcore.cad.dto.CadProcessResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class GeometryClient {

    private static final Logger log = LoggerFactory.getLogger(GeometryClient.class);

    @Value("${app.geometry-service.url:http://localhost:8000}")
    private String geometryServiceUrl;

    @Value("${app.geometry-service.internal-api-key:local-dev-internal-key-change-in-production}")
    private String internalApiKey;

    private final RestTemplate restTemplate;

    public GeometryClient() {
        this.restTemplate = new RestTemplate();
    }

    public CadProcessResult processCadFile(byte[] fileBytes, String filename, String format, String units) {
        String endpoint = geometryServiceUrl + "/internal/v1/cad/process";
        log.info("Sending CAD file '{}' ({} bytes, format={}) to geometry service at {}", filename, fileBytes.length, format, endpoint);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("X-Internal-Key", internalApiKey);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        body.add("file", fileResource);
        body.add("format", format);
        body.add("units", units);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<CadProcessResult> response = restTemplate.postForEntity(endpoint, requestEntity, CadProcessResult.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (RestClientException ex) {
            log.warn("Geometry service request failed: {}. Falling back to default or unsupported preview status.", ex.getMessage());
        }

        // Safe fallback when geometry service is unreachable or encounters an error
        return new CadProcessResult(
            null,
            "FAILED",
            "Geometry service processing unavailable",
            null, null, null,
            null, null, null,
            null, null,
            java.util.List.of("Geometry service unavailable")
        );
    }

    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> generateToolpath(java.util.Map<String, Object> payload) {
        String endpoint = geometryServiceUrl + "/internal/v1/cam/toolpath";
        log.info("Requesting toolpath generation from geometry service at {}", endpoint);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", internalApiKey);

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<java.util.Map> response = restTemplate.postForEntity(endpoint, requestEntity, java.util.Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (java.util.Map<String, Object>) response.getBody();
            }
        } catch (RestClientException ex) {
            log.error("Failed to call geometry service toolpath generator: {}", ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "Geometry service toolpath generator failed: " + ex.getMessage());
        }
        throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR, "Empty response from geometry service toolpath generator");
    }

    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> validateGCode(java.util.Map<String, Object> payload) {
        String endpoint = geometryServiceUrl + "/internal/v1/cam/gcode/validate";
        log.info("Requesting G-code post-processing and validation from geometry service at {}", endpoint);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", internalApiKey);

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<java.util.Map> response = restTemplate.postForEntity(endpoint, requestEntity, java.util.Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (java.util.Map<String, Object>) response.getBody();
            }
        } catch (RestClientException ex) {
            log.error("Failed to call geometry service G-code validator: {}", ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "Geometry service G-code validator failed: " + ex.getMessage());
        }
        throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR, "Empty response from geometry service G-code validator");
    }

    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> analyzeSimulation(java.util.Map<String, Object> payload) {
        String endpoint = geometryServiceUrl + "/internal/v1/simulation/analyze";
        log.info("Requesting simulation risk analysis from geometry service at {}", endpoint);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", internalApiKey);

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<java.util.Map> response = restTemplate.postForEntity(endpoint, requestEntity, java.util.Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (java.util.Map<String, Object>) response.getBody();
            }
        } catch (RestClientException ex) {
            log.error("Failed to call geometry service simulation analyzer: {}", ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "Geometry service simulation analyzer failed: " + ex.getMessage());
        }
        throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR, "Empty response from geometry service simulation analyzer");
    }
}
