import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { policySchema } from "@/lib/schema";
import type { RedactionPolicy } from "@/types/api";

// Default policy
const defaultPolicy: RedactionPolicy = {
  extends: "secrets",
  rules: [],
};

// Policy file path - can be overridden via environment variable
const POLICY_FILE_PATH = process.env.POLICY_FILE_PATH || "/app/custom-policy.json";

async function loadPolicyFromFile(): Promise<RedactionPolicy> {
  try {
    const content = await fs.readFile(POLICY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    const result = policySchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    console.warn("Policy file validation failed, using defaults");
    return { ...defaultPolicy };
  } catch (error) {
    console.warn("Failed to load policy file, using defaults:", error);
    return { ...defaultPolicy };
  }
}

async function savePolicyToFile(policy: RedactionPolicy): Promise<void> {
  try {
    await fs.writeFile(POLICY_FILE_PATH, JSON.stringify(policy, null, 2), "utf-8");
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