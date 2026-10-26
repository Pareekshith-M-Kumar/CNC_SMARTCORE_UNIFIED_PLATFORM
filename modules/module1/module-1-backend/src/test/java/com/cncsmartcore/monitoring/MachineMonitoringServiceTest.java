package com.cncsmartcore.monitoring;

import com.cncsmartcore.monitoring.exception.ResourceNotFoundException;
import com.cncsmartcore.monitoring.exception.ValidationException;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.repository.AlertRepository;
import com.cncsmartcore.monitoring.repository.MachineMetricsRepository;
import com.cncsmartcore.monitoring.repository.MachineRepository;
import com.cncsmartcore.monitoring.service.MachineMonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("MachineMonitoringService Tests")
class MachineMonitoringServiceTest {

    @Mock MachineRepository machineRepository;
    @Mock MachineMetricsRepository metricsRepository;
    @Mock AlertRepository alertRepository;

    @InjectMocks MachineMonitoringService service;

    private Machine sampleMachine;

    @BeforeEach
    void setUp() {
        sampleMachine = Machine.builder()
                .id(1L)
                .machineCode("CNC-001")
                .name("Haas VF-2")
                .status(Machine.MachineStatus.IDLE)
                .isActive(true)
                .build();
    }

    // ── createMachine ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createMachine: should save and return new machine")
    void createMachine_success() {
        when(machineRepository.existsByMachineCode("CNC-001")).thenReturn(false);
        when(machineRepository.save(any())).thenReturn(sampleMachine);

        Machine result = service.createMachine(sampleMachine);

        assertThat(result).isNotNull();
        assertThat(result.getMachineCode()).isEqualTo("CNC-001");
        verify(machineRepository).save(any());
    }

    @Test
    @DisplayName("createMachine: duplicate code should throw ValidationException")
    void createMachine_duplicateCode_throws() {
        when(machineRepository.existsByMachineCode("CNC-001")).thenReturn(true);
        assertThatThrownBy(() -> service.createMachine(sampleMachine))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("CNC-001");
    }

    // ── getMachineById ────────────────────────────────────────────────────────

    @Test
    @DisplayName("getMachineById: should return machine when found")
    void getMachineById_found() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        Machine result = service.getMachineById(1L);
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getMachineById: should throw ResourceNotFoundException when not found")
    void getMachineById_notFound() {
        when(machineRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMachineById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateMachineStatus ───────────────────────────────────────────────────

    @Test
    @DisplayName("updateMachineStatus: should update status and persist")
    void updateMachineStatus_success() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        when(machineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Machine result = service.updateMachineStatus(1L, Machine.MachineStatus.RUNNING);

        assertThat(result.getStatus()).isEqualTo(Machine.MachineStatus.RUNNING);
        verify(machineRepository).save(sampleMachine);
    }

    // ── ingestMetrics ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("ingestMetrics: should save metrics and return saved entity")
    void ingestMetrics_success() {
        MachineMetrics metrics = MachineMetrics.builder()
                .temperature(60.0)
                .spindleLoad(70.0)
                .vibrationX(1.2)
                .coolantLevel(80.0)
                .build();

        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        when(metricsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(alertRepository.findOpenAlertsByMachineAndType(any(), any())).thenReturn(List.of());

        MachineMetrics saved = service.ingestMetrics(1L, metrics);

        assertThat(saved.getMachine()).isEqualTo(sampleMachine);
        verify(metricsRepository).save(metrics);
    }

    @Test
    @DisplayName("ingestMetrics: high temperature should raise an alert")
    void ingestMetrics_highTemp_raisesAlert() {
        MachineMetrics metrics = MachineMetrics.builder()
                .temperature(90.0)   // above 75°C threshold
                .spindleLoad(50.0)
                .coolantLevel(80.0)
                .build();

        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        when(metricsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(alertRepository.findOpenAlertsByMachineAndType(any(), any())).thenReturn(List.of());

        service.ingestMetrics(1L, metrics);

        verify(alertRepository, atLeastOnce()).save(any());
    }

    // ── getAllActiveMachines ───────────────────────────────────────────────────

    @Test
    @DisplayName("getAllActiveMachines: should return active machine list")
    void getAllActiveMachines_returnsList() {
        when(machineRepository.findByIsActiveTrue()).thenReturn(List.of(sampleMachine));
        List<Machine> result = service.getAllActiveMachines();
        assertThat(result).hasSize(1);
    }

    // ── deactivateMachine ─────────────────────────────────────────────────────

    @Test
    @DisplayName("deactivateMachine: should set isActive=false and status=OFFLINE")
    void deactivateMachine_setsInactive() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        when(machineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deactivateMachine(1L);

        assertThat(sampleMachine.getIsActive()).isFalse();
        assertThat(sampleMachine.getStatus()).isEqualTo(Machine.MachineStatus.OFFLINE);
        verify(machineRepository).save(sampleMachine);
    }
}
