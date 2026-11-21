import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  appendAuditLog,
  lookupDoctorBriefByToken,
} from "@/lib/data/repository";
import { sha256Hex } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const submittedPin =
      typeof body?.pin === "string" ? body.pin.trim() : "";

    const lookup = await lookupDoctorBriefByToken(token);

    if (lookup.status === "not_found") {
      return NextResponse.json(
        { error: "Invalid or unknown Doctor QR Brief token." },
        { status: 404 }
      );
    }

    if (lookup.status === "revoked") {
      return NextResponse.json(
        { error: "This QR Brief token has been revoked by the family caregiver." },
        { status: 403 }
      );
    }

    if (lookup.status === "expired") {
      return NextResponse.json(
        { error: "This 30-minute Doctor QR Brief token has expired." },
        { status: 410 }
      );
    }

    const shareToken = lookup.shareToken!;
    if (shareToken.pin_code && shareToken.pin_code.trim().length > 0) {
      if (submittedPin !== shareToken.pin_code.trim()) {
        return NextResponse.json(
          { error: "Incorrect 4-digit consultation PIN." },
          { status: 401 }
        );
      }
    }

    // Set HTTP-only verification cookie scoped to this token hash
    const tokenHash = sha256Hex(token);
    const cookieStore = await cookies();
    cookieStore.set(`ayuvansha_pin_${tokenHash.slice(0, 16)}`, "verified", {
      httpOnly: true,
      sameSite: "lax",
      path: `/brief/${token}`,
      expires: new Date(shareToken.expires_at),
    });

    // Write immutable audit trail row: actor_type = 'doctor_qr_session', action = 'VIEWED_QR_BRIEF'
    const userAgent = request.headers.get("user-agent") || "Physician Mobile Browser";
    await appendAuditLog({
      familyId: shareToken.family_id,
      memberId: shareToken.member_id,
      actorType: "doctor_qr_session",
      actorIdentifier: `PIN-Verified QR Session (${userAgent.slice(0, 48)})`,
      action: "VIEWED_QR_BRIEF",
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      expiresAt: shareToken.expires_at,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to verify Doctor QR Brief PIN.",
      },
      { status: 500 }
    );
  }
}
