package com.cncsmartcore.tool;

import com.cncsmartcore.tool.dto.CuttingToolResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cutting-tools")
public class CuttingToolController {

    private final CuttingToolRepository cuttingToolRepository;

    public CuttingToolController(CuttingToolRepository cuttingToolRepository) {
        this.cuttingToolRepository = cuttingToolRepository;
    }

    @GetMapping
    public List<CuttingToolResponse> listTools() {
        return cuttingToolRepository.findAllByIsActiveTrue().stream()
                .map(CuttingToolResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public CuttingToolResponse getTool(@PathVariable UUID id) {
        CuttingTool t = cuttingToolRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cutting tool not found: " + id));
        return CuttingToolResponse.from(t);
    }
}
