package com.cncsmartcore.monitoring;

import com.cncsmartcore.monitoring.exception.ValidationException;
import com.cncsmartcore.monitoring.model.*;
import com.cncsmartcore.monitoring.repository.*;
import com.cncsmartcore.monitoring.service.MLIntegrationService;
import com.cncsmartcore.monitoring.service.ToolWearService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ToolWearService Tests")
class ToolWearServiceTest {

    @Mock
    ToolRepository toolRepository;
    @Mock
    ToolUsageRepository toolUsageRepository;
    @Mock
    MachineRepository machineRepository;
    @Mock
    AlertRepository alertRepository;
    @Mock
    MLIntegrationService mlIntegrationService;

    @InjectMocks
    ToolWearService service;

    private Tool sampleTool;
    private Machine sampleMachine;

    @BeforeEach
    void setUp() {
        sampleMachine = Machine.builder()
                .id(1L).machineCode("CNC-001").name("Haas VF-2")
                .status(Machine.MachineStatus.RUNNING).isActive(true).build();

        sampleTool = Tool.builder()
                .id(1L).toolCode("T001").name("20mm End Mill")
                .toolType(Tool.ToolType.END_MILL).material("Carbide")
                .wearPercentage(40.0).maxLifeMinutes(200.0).usedLifeMinutes(80.0)
                .replacementThreshold(80.0).condition(Tool.ToolCondition.WORN)
                .currentMachine(sampleMachine).isActive(true).build();
    }

    @Test
    @DisplayName("createTool: should save tool when code is unique")
    void createTool_success() {
        when(toolRepository.existsByToolCode("T001")).thenReturn(false);
        when(toolRepository.save(any())).thenReturn(sampleTool);

        Tool result = service.createTool(sampleTool);
        assertThat(result.getToolCode()).isEqualTo("T001");
    }

    @Test
    @DisplayName("createTool: duplicate code should throw ValidationException")
    void createTool_duplicateCode_throws() {
        when(toolRepository.existsByToolCode("T001")).thenReturn(true);
        assertThatThrownBy(() -> service.createTool(sampleTool))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    @DisplayName("replaceTool: should reset wear and set condition to NEW")
    void replaceTool_resetsWear() {
        when(toolRepository.findById(1L)).thenReturn(Optional.of(sampleTool));
        when(alertRepository.findOpenAlertsByMachineAndType(any(), any())).thenReturn(List.of());
        when(toolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Tool result = service.replaceTool(1L);

        assertThat(result.getWearPercentage()).isEqualTo(0.0);
        assertThat(result.getUsedLifeMinutes()).isEqualTo(0.0);
        assertThat(result.getCondition()).isEqualTo(Tool.ToolCondition.NEW);
    }

    @Test
    @DisplayName("startToolUsage: should throw for broken tool")
    void startToolUsage_brokenTool_throws() {
        sampleTool.setCondition(Tool.ToolCondition.BROKEN);

        when(toolRepository.findById(1L)).thenReturn(Optional.of(sampleTool));
        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));

        assertThatThrownBy(() -> service.startToolUsage(1L, 1L, null))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("broken");
    }

    @Test
    @DisplayName("startToolUsage: should save usage record for valid tool")

    void startToolUsage_valid() {
        sampleTool.setCondition(Tool.ToolCondition.GOOD);
        when(toolRepository.findById(1L)).thenReturn(Optional.of(sampleTool));
        when(machineRepository.findById(1L)).thenReturn(Optional.of(sampleMachine));
        when(toolUsageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ToolUsage usage = service.startToolUsage(1L, 1L, null);

        assertThat(usage.getTool()).isEqualTo(sampleTool);
        assertThat(usage.getMachine()).isEqualTo(sampleMachine);
        assertThat(usage.getWearBefore()).isEqualTo(40.0);
    }

    @Test
    @DisplayName("getToolsNeedingReplacement: delegates to repository")
    void getToolsNeedingReplacement() {
        when(toolRepository.findToolsNeedingReplacement()).thenReturn(List.of(sampleTool));
        List<Tool> result = service.getToolsNeedingReplacement();
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("completeToolUsage: should update wear and call ML service")
    void completeToolUsage_updatesWear() {
        ToolUsage usage = ToolUsage.builder()
                .id(10L).tool(sampleTool).machine(sampleMachine)
                .usageStart(java.time.LocalDateTime.now().minusMinutes(30))
                .wearBefore(40.0)
                .build();

        when(toolUsageRepository.findById(10L)).thenReturn(Optional.of(usage));
        when(mlIntegrationService.predictToolRemainingLife(any(), any()))
                .thenReturn(Map.of("remaining_life_minutes", 90.0));
        when(toolUsageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(toolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(alertRepository.findOpenAlertsByMachineAndType(any(), any())).thenReturn(List.of());

        ToolUsage completed = service.completeToolUsage(10L, 5000.0, 2000.0, 300.0, 5);

        assertThat(completed.getPredictedRemainingLife()).isEqualTo(90.0);
        assertThat(completed.getPartsMachined()).isEqualTo(5);
        verify(toolRepository).save(sampleTool);
    }
}