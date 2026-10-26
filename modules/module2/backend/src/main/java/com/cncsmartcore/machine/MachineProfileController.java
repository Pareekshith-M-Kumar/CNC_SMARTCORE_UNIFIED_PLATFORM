package com.cncsmartcore.machine;

import com.cncsmartcore.machine.dto.MachineProfileResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/machine-profiles")
public class MachineProfileController {

    private final MachineProfileRepository machineProfileRepository;

    public MachineProfileController(MachineProfileRepository machineProfileRepository) {
        this.machineProfileRepository = machineProfileRepository;
    }

    @GetMapping
    public List<MachineProfileResponse> listMachines() {
        return machineProfileRepository.findAllByIsActiveTrue().stream()
                .map(MachineProfileResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public MachineProfileResponse getMachine(@PathVariable UUID id) {
        MachineProfile m = machineProfileRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine profile not found: " + id));
        return MachineProfileResponse.from(m);
    }
}
