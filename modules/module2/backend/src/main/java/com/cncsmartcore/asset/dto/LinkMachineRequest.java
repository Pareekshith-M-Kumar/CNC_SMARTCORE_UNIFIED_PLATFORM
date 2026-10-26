package com.cncsmartcore.asset.dto;

public record LinkMachineRequest(
    String machineCode,
    String machineName,
    String location
) {}
