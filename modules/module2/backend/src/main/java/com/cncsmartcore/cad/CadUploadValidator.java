package com.cncsmartcore.cad;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

@Component
public class CadUploadValidator {

    public static final long MAX_FILE_SIZE = 52_428_800L; // 50 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("stl", "step", "stp", "iges", "igs");

    public record ValidatedCadFile(
        String originalFilename,
        String format,
        long sizeBytes,
        byte[] content
    ) {}

    public ValidatedCadFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CAD file must not be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File size exceeds the 50 MB limit");
        }

        String rawFilename = file.getOriginalFilename();
        if (rawFilename == null || rawFilename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filename is missing");
        }

        // Sanitise filename
        String sanitizedFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (sanitizedFilename.length() > 150) {
            sanitizedFilename = sanitizedFilename.substring(sanitizedFilename.length() - 150);
        }

        int lastDotIndex = sanitizedFilename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == sanitizedFilename.length() - 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must have a valid extension (.stl, .step, .stp, .iges, .igs)");
        }

        String extension = sanitizedFilename.substring(lastDotIndex + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file format ." + extension + ". Allowed: STL, STEP, IGES");
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read uploaded file content");
        }

        // Check for executable signatures (MZ for Windows PE, \x7fELF for Linux)
        if (content.length >= 2 && content[0] == 0x4D && content[1] == 0x5A) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file: Executable binary detected");
        }
        if (content.length >= 4 && content[0] == 0x7F && content[1] == 'E' && content[2] == 'L' && content[3] == 'F') {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file: ELF binary detected");
        }

        String canonicalFormat = switch (extension) {
            case "stl" -> "STL";
            case "step", "stp" -> "STEP";
            case "iges", "igs" -> "IGES";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown CAD extension");
        };

        // Header check
        validateHeader(canonicalFormat, content);

        return new ValidatedCadFile(sanitizedFilename, canonicalFormat, content.length, content);
    }

    private void validateHeader(String format, byte[] content) {
        String headerPreview = new String(content, 0, Math.min(content.length, 512), StandardCharsets.ISO_8859_1).trim();

        if ("STL".equals(format)) {
            // STL must be either ASCII starting with "solid" or binary of at least 84 bytes
            boolean isAscii = headerPreview.toLowerCase(Locale.ROOT).startsWith("solid");
            boolean isBinary = content.length >= 84;
            if (!isAscii && !isBinary) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed STL file: invalid header or truncated content");
            }
        } else if ("STEP".equals(format)) {
            if (!headerPreview.toUpperCase(Locale.ROOT).contains("ISO-10303-21")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed STEP file: missing ISO-10303-21 header");
            }
        }
    }
}
