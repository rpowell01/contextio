import { NextRequest, NextResponse } from "next/server";
import { policySchema } from "@/lib/schema";
import type { RedactionPolicy } from "@/types/api";

// Default policy
const defaultPolicy: RedactionPolicy = {
  extends: "secrets",
};

// In-memory storage (in production, this would be a database or file)
let storedPolicy: RedactionPolicy = { ...defaultPolicy };

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(storedPolicy);
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
    
    // Store the policy
    storedPolicy = result.data;
    
    return NextResponse.json(storedPolicy);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save policy" },
      { status: 500 }
    );
  }
}