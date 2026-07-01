import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { policySchema } from "@/lib/schema";
import type { RedactionPolicy } from "@/types/api";
import { join } from "node:path";

// Default policy - bundled with the application (used as fallback)
const bundledDefaultPolicy: RedactionPolicy = {
  extends: "secrets",
  rules: [],
  allowlist: {
    strings: [],
    patterns: [],
  },
  paths: {
    only: [],
    skip: [],
  },
};

// Policy file paths - custom file (user-modifiable) or bundled default
// Use REDACT_POLICY_FILE to match the redact plugin's environment variable
const CUSTOM_POLICY_PATH = process.env.REDACT_POLICY_FILE || "/app/custom-policy.json";
// BUNDLED_POLICY_PATH can be set via env for Docker, otherwise use relative path
const BUNDLED_POLICY_PATH = process.env.BUNDLED_POLICY_PATH || "/app/default-policy.json";

async function loadPolicyFromFile(): Promise<RedactionPolicy> {
  try {
    // First, try to load the custom policy file
    const content = await fs.readFile(CUSTOM_POLICY_PATH, "utf-8");
    const parsed = JSON.parse(content);
    const result = policySchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    console.warn("Policy file validation failed, using defaults");
    return { ...bundledDefaultPolicy };
  } catch (error) {
    // Custom file doesn't exist or is invalid - try bundled default
    try {
      const bundledContent = await fs.readFile(BUNDLED_POLICY_PATH, "utf-8");
      const parsed = JSON.parse(bundledContent);
      const result = policySchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch (bundledError) {
      // Try fallback to public/default-policy.json for development
      try {
        const devPolicyPath = join(process.cwd(), "public", "default-policy.json");
        const devContent = await fs.readFile(devPolicyPath, "utf-8");
        const parsed = JSON.parse(devContent);
        const result = policySchema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
      } catch (devError) {
        // Fall through to in-memory default
      }
    }
    console.warn("Failed to load policy file, using in-memory defaults");
    return { ...bundledDefaultPolicy };
  }
}

async function savePolicyToFile(policy: RedactionPolicy): Promise<void> {
  try {
    // Ensure directory exists
    const dir = CUSTOM_POLICY_PATH.substring(0, CUSTOM_POLICY_PATH.lastIndexOf("/"));
    await fs.mkdir(dir, { recursive: true });
    
    // Write the policy file
    await fs.writeFile(CUSTOM_POLICY_PATH, JSON.stringify(policy, null, 2), "utf-8");
    
    // Ensure the file has proper permissions (world-writable for container environments)
    try {
      await fs.chmod(CUSTOM_POLICY_PATH, 0o666);
    } catch {
      // Ignore chmod errors (may not be supported on all filesystems)
    }
  } catch (error) {
    console.error("Failed to save policy file:", error);
    throw new Error("Failed to persist policy to file");
  }
}

export async function GET(_request: NextRequest) {
  try {
    const policy = await loadPolicyFromFile();
    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load policy" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the policy
    const result = policySchema.safeParse(body);
    if (!result.success) {
      const errorDetails = result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Invalid policy", details: errorDetails },
        { status: 400 }
      );
    }
    
    // Save the policy to file
    await savePolicyToFile(result.data);
    
    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save policy" },
      { status: 500 }
    );
  }
}