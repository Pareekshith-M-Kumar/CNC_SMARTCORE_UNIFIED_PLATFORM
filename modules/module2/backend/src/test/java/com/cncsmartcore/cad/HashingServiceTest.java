package com.cncsmartcore.cad;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class HashingServiceTest {

    private final HashingService hashingService = new HashingService();

    @Test
    @DisplayName("Should compute correct SHA-256 for known standard test vectors")
    void shouldComputeCorrectSha256() throws IOException {
        // Known NIST vector: SHA-256 of empty byte array
        String emptyHash = hashingService.computeSha256(new byte[0]);
        assertThat(emptyHash).isEqualTo("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

        // Known vector: SHA-256 of "hello world"
        byte[] helloBytes = "hello world".getBytes(StandardCharsets.UTF_8);
        String helloHash = hashingService.computeSha256(helloBytes);
        assertThat(helloHash).isEqualTo("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");

        // Stream version
        try (ByteArrayInputStream in = new ByteArrayInputStream(helloBytes)) {
            String streamHash = hashingService.computeSha256(in);
            assertThat(streamHash).isEqualTo("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
        }
    }
}
