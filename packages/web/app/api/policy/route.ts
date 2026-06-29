import { NextRequest, NextResponse } from "next/server";
import { policySchema } from "@/lib/schema";

// Default policy
const defaultPolicy = {
  extends: "secrets" as const,
};

// In-memory storage (in production, this would be a database or file)
let storedPolicy = { ...defaultPolicy };

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
      return NextResponse.json(
        { error: "Invalid policy", details: result.error.errors },
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