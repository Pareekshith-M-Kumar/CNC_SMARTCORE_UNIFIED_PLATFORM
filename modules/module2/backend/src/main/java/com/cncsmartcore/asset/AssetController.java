package com.cncsmartcore.asset;

import com.cncsmartcore.asset.dto.AssetResponse;
import com.cncsmartcore.asset.dto.RegisterAssetRequest;
import com.cncsmartcore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    public ResponseEntity<List<AssetResponse>> getAssets(
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(assetService.getAssets(currentUser));
    }

    @GetMapping("/{tag}")
    public ResponseEntity<AssetResponse> getAssetByTag(
            @PathVariable String tag,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(assetService.getAssetByTag(tag, currentUser));
    }

    @PostMapping("/{tag}/register")
    public ResponseEntity<AssetResponse> registerAsset(
            @PathVariable String tag,
            @RequestBody(required = false) RegisterAssetRequest request,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(assetService.registerAsset(tag, request, currentUser));
    }

    @PostMapping("/{tag}/link-machine")
    public ResponseEntity<AssetResponse> linkMachine(
            @PathVariable String tag,
            @RequestBody(required = false) com.cncsmartcore.asset.dto.LinkMachineRequest request,
            @AuthenticationPrincipal CurrentUser currentUser
    ) {
        return ResponseEntity.ok(assetService.linkMachine(tag, request, currentUser));
    }
}
