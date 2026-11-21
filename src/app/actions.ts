"use server";

import { revalidatePath } from "next/cache";
import {
  confirmAndCommitHitlEvents,
  createEphemeralShareToken,
  createNewFamilyWorkspace,
  getWorkspaceSnapshot,
  insertFamilyMemberRecord,
  purgeMemberAndStorageData,
  revokeShareTokenById,
  updateFamilyTierRecord,
  type ConfirmHitlEventsInput,
} from "@/lib/data/repository";
import { generateSecureToken } from "@/lib/utils";
import {
  SUBSCRIPTION_TIER_LIMITS,
  type BiologicalSex,
  type SubscriptionTier,
} from "@/types/database";

export async function addFamilyMemberAction(formData: {
  familyId: string;
  fullName: string;
  relationshipLabel: string;
  dob: string | null;
  biologicalSex: BiologicalSex | null;
  bloodGroup: string | null;
  isDeceased: boolean;
  causeOfDeath: string | null;
  motherId: string | null;
  fatherId: string | null;
  consentVerified: boolean;
}) {
  const snapshot = await getWorkspaceSnapshot(formData.familyId);
  const tierConfig = SUBSCRIPTION_TIER_LIMITS[snapshot.family.subscription_tier];

  if (
    tierConfig.maxMembers !== null &&
    snapshot.members.length >= tierConfig.maxMembers
  ) {
    return {
      ok: false,
      error: `Your ${tierConfig.label} plan supports up to ${tierConfig.maxMembers} family member(s). Upgrade to Family Care or Multi-Gen Plus to add more relatives.`,
    };
  }

  const created = await insertFamilyMemberRecord({
    family_id: formData.familyId,
    full_name: formData.fullName.trim(),
    relationship_label: formData.relationshipLabel.trim(),
    dob: formData.dob || null,
    biological_sex: formData.biologicalSex || null,
    blood_group: formData.bloodGroup || null,
    is_deceased: formData.isDeceased,
    cause_of_death: formData.isDeceased ? formData.causeOfDeath || null : null,
    mother_id: formData.motherId || null,
    father_id: formData.fatherId || null,
    consent_verified: formData.consentVerified,
  });

  revalidatePath("/");
  revalidatePath(`/members/${created.id}`);
  revalidatePath("/upload");
  return { ok: true, member: created };
}

export async function confirmHitlExtractionAction(
  input: ConfirmHitlEventsInput
) {
  const events = await confirmAndCommitHitlEvents(input);
  revalidatePath("/");
  revalidatePath("/upload");
  revalidatePath(`/members/${input.memberId}`);
  return { ok: true, insertedCount: events.length };
}

export async function generateDoctorQrShareAction(params: {
  familyId: string;
  memberId: string;
  pinCode: string | null;
}) {
  const snapshot = await getWorkspaceSnapshot(params.familyId);
  const cleanPin =
    params.pinCode && /^\d{4}$/.test(params.pinCode.trim())
      ? params.pinCode.trim()
      : null;

  const rawToken = generateSecureToken(24);
  const row = await createEphemeralShareToken({
    familyId: params.familyId,
    memberId: params.memberId,
    rawToken,
    pinCode: cleanPin,
    createdBy: snapshot.currentUser.id,
    durationMinutes: 30,
  });

  revalidatePath("/");
  revalidatePath(`/members/${params.memberId}`);

  return {
    ok: true,
    rawToken,
    tokenId: row.id,
    expiresAt: row.expires_at,
    hasPin: Boolean(cleanPin),
    pinCode: cleanPin,
  };
}

export async function revokeDoctorQrShareAction(params: {
  tokenId: string;
  familyId: string;
  memberId?: string;
}) {
  await revokeShareTokenById(params.tokenId, params.familyId);
  revalidatePath("/");
  if (params.memberId) {
    revalidatePath(`/members/${params.memberId}`);
  }
  return { ok: true };
}

export async function purgeMemberDataAction(params: {
  familyId: string;
  memberId: string;
}) {
  const snapshot = await getWorkspaceSnapshot(params.familyId);
  const result = await purgeMemberAndStorageData({
    familyId: params.familyId,
    memberId: params.memberId,
    actorIdentifier: snapshot.currentUser.email,
  });

  revalidatePath("/");
  revalidatePath("/upload");
  return {
    ok: true,
    ...result,
  };
}

export async function switchSubscriptionTierAction(params: {
  familyId: string;
  tier: SubscriptionTier;
}) {
  await updateFamilyTierRecord(params.familyId, params.tier);
  revalidatePath("/");
  revalidatePath("/upload");
  return { ok: true };
}

export async function createFamilyWorkspaceAction(params: {
  name: string;
  tier?: SubscriptionTier;
}) {
  const created = await createNewFamilyWorkspace(
    params.name.trim(),
    params.tier || "free"
  );
  revalidatePath("/");
  return { ok: true, family: created };
}
