package com.config;

import java.io.File;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Resolves the uploads directory to always be inside the Backend/ folder.
 *
 * Detection order (most reliable → fallback):
 *   1. Classpath location  – navigates up from .../Backend/target/classes/ to Backend/
 *   2. user.dir heuristic  – checks if user.dir/Backend/pom.xml exists
 *   3. user.dir as-is      – assumes we are already inside Backend/
 */
public class UploadUtils {

    /** Absolute path to the uploads base directory (Backend/uploads/). */
    public static final Path UPLOADS_BASE;

    static {
        UPLOADS_BASE = resolveUploadsBase().resolve("uploads").normalize();
    }

    private static Path resolveUploadsBase() {
        // --- Strategy 1: classpath location ---
        // When Spring Boot runs, this class compiles to Backend/target/classes/com/config/UploadUtils.class
        // Walk up until we find a directory containing pom.xml (that is the Backend dir).
        try {
            Path classFile = Paths.get(
                    UploadUtils.class.getProtectionDomain().getCodeSource().getLocation().toURI()
            ).toAbsolutePath().normalize();

            Path candidate = classFile;
            for (int i = 0; i < 8; i++) {           // walk up at most 8 levels
                if (candidate == null) break;
                if (Files.exists(candidate.resolve("pom.xml"))) {
                    return candidate;               // found Backend/
                }
                candidate = candidate.getParent();
            }
        } catch (URISyntaxException | NullPointerException ignored) {
            // fall through to strategy 2
        }

        // --- Strategy 2: user.dir heuristic ---
        Path workDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (Files.exists(workDir.resolve("Backend").resolve("pom.xml"))) {
            return workDir.resolve("Backend");
        }

        // --- Strategy 3: user.dir is already Backend/ ---
        return workDir;
    }

    /** Returns an absolute path for a subdirectory/file under the uploads base. */
    public static Path resolve(String subpath) {
        return UPLOADS_BASE.resolve(subpath);
    }
}
