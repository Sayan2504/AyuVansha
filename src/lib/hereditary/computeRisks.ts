import type { FamilyMemberRow, TimelineEventRow } from "@/types/database";

export type LineageSide = "Paternal Lineage" | "Maternal Lineage" | "Direct / Self";

export interface HereditaryRelativeMatch {
  memberId: string;
  fullName: string;
  relationshipLabel: string;
  generationDepth: number; // 1 = parent, 2 = grandparent, 3 = great-grandparent
  isDeceased: boolean;
}

export interface HereditaryConditionAlert {
  conditionTitle: string;
  eventType: "diagnosis" | "allergy" | "medication" | "surgery" | "lab_abnormal";
  lineage: LineageSide;
  relatives: HereditaryRelativeMatch[];
  formattedSummary: string; // e.g., "Paternal Lineage: Type 2 Diabetes (Father, Paternal Grandfather)"
}

export interface HereditaryRiskRollup {
  targetMemberId: string;
  targetMemberName: string;
  paternalAlerts: HereditaryConditionAlert[];
  maternalAlerts: HereditaryConditionAlert[];
  directAlerts: HereditaryConditionAlert[];
  allSummaries: string[];
}

interface AncestorNode {
  member: FamilyMemberRow;
  lineage: "Paternal Lineage" | "Maternal Lineage";
  depth: number;
}

/**
 * Traverses mother_id (maternal lineage) and father_id (paternal lineage) up to 3 generations.
 * Collects all verified timeline_events where is_hereditary_flag = true or event_type = 'allergy'.
 * Outputs deduplicated clinical alerts grouped by lineage.
 */
export function computeHereditaryRisks(
  memberId: string,
  members: FamilyMemberRow[],
  events: TimelineEventRow[],
  maxGenerations = 3
): HereditaryRiskRollup {
  const memberById = new Map<string, FamilyMemberRow>();
  for (const m of members) {
    memberById.set(m.id, m);
  }

  const targetMember = memberById.get(memberId);
  if (!targetMember) {
    return {
      targetMemberId: memberId,
      targetMemberName: "Unknown Member",
      paternalAlerts: [],
      maternalAlerts: [],
      directAlerts: [],
      allSummaries: [],
    };
  }

  const ancestors: AncestorNode[] = [];
  const visited = new Set<string>([memberId]);

  function traverse(
    currentId: string | null,
    rootLineage: "Paternal Lineage" | "Maternal Lineage",
    depth: number
  ) {
    if (!currentId || depth > maxGenerations || visited.has(currentId)) {
      return;
    }
    const ancestor = memberById.get(currentId);
    if (!ancestor) return;

    visited.add(currentId);
    ancestors.push({
      member: ancestor,
      lineage: rootLineage,
      depth,
    });

    // Traverse further up up to maxGenerations (3 generations)
    traverse(ancestor.father_id, rootLineage, depth + 1);
    traverse(ancestor.mother_id, rootLineage, depth + 1);
  }

  // Generation 1 roots specify whether the branch belongs to Maternal or Paternal lineage
  traverse(targetMember.father_id, "Paternal Lineage", 1);
  traverse(targetMember.mother_id, "Maternal Lineage", 1);

  // Filter eligible clinical events: verified_by_user AND (is_hereditary_flag = true OR event_type = 'allergy')
  const relevantEvents = events.filter(
    (ev) =>
      ev.verified_by_user &&
      (ev.is_hereditary_flag || ev.event_type === "allergy")
  );

  function buildLineageAlerts(
    lineage: "Paternal Lineage" | "Maternal Lineage"
  ): HereditaryConditionAlert[] {
    const lineageAncestors = ancestors.filter((a) => a.lineage === lineage);
    const ancestorMap = new Map<string, AncestorNode>();
    for (const node of lineageAncestors) {
      ancestorMap.set(node.member.id, node);
    }

    // Group by normalized condition title
    const grouped = new Map<
      string,
      {
        displayTitle: string;
        eventType: TimelineEventRow["event_type"];
        relativesMap: Map<string, HereditaryRelativeMatch>;
      }
    >();

    for (const ev of relevantEvents) {
      const node = ancestorMap.get(ev.member_id);
      if (!node) continue;

      const normalizedKey = ev.title.trim().toLowerCase();
      if (!grouped.has(normalizedKey)) {
        grouped.set(normalizedKey, {
          displayTitle: ev.title.trim(),
          eventType: ev.event_type,
          relativesMap: new Map(),
        });
      }

      const entry = grouped.get(normalizedKey)!;
      if (!entry.relativesMap.has(node.member.id)) {
        entry.relativesMap.set(node.member.id, {
          memberId: node.member.id,
          fullName: node.member.full_name,
          relationshipLabel: node.member.relationship_label,
          generationDepth: node.depth,
          isDeceased: node.member.is_deceased,
        });
      }
    }

    const alerts: HereditaryConditionAlert[] = [];
    for (const [, val] of grouped) {
      const relatives = Array.from(val.relativesMap.values()).sort(
        (a, b) => a.generationDepth - b.generationDepth
      );
      const relativeLabels = relatives.map((r) => r.relationshipLabel).join(", ");
      alerts.push({
        conditionTitle: val.displayTitle,
        eventType: val.eventType,
        lineage,
        relatives,
        formattedSummary: `${lineage}: ${val.displayTitle} (${relativeLabels})`,
      });
    }

    return alerts;
  }

  const paternalAlerts = buildLineageAlerts("Paternal Lineage");
  const maternalAlerts = buildLineageAlerts("Maternal Lineage");

  // Also capture direct hereditary/allergy flags on the member themselves
  const directGrouped = new Map<string, HereditaryConditionAlert>();
  for (const ev of relevantEvents) {
    if (ev.member_id !== memberId) continue;
    const key = ev.title.trim().toLowerCase();
    if (!directGrouped.has(key)) {
      directGrouped.set(key, {
        conditionTitle: ev.title.trim(),
        eventType: ev.event_type,
        lineage: "Direct / Self",
        relatives: [
          {
            memberId: targetMember.id,
            fullName: targetMember.full_name,
            relationshipLabel: targetMember.relationship_label,
            generationDepth: 0,
            isDeceased: targetMember.is_deceased,
          },
        ],
        formattedSummary: `Direct (${targetMember.relationship_label}): ${ev.title.trim()}`,
      });
    }
  }
  const directAlerts = Array.from(directGrouped.values());

  return {
    targetMemberId: targetMember.id,
    targetMemberName: targetMember.full_name,
    paternalAlerts,
    maternalAlerts,
    directAlerts,
    allSummaries: [
      ...paternalAlerts.map((a) => a.formattedSummary),
      ...maternalAlerts.map((a) => a.formattedSummary),
    ],
  };
}

/**
 * Computes family-wide hereditary risk rollup across all members in a household.
 */
export function computeFamilyWideRisks(
  members: FamilyMemberRow[],
  events: TimelineEventRow[]
): HereditaryConditionAlert[] {
  // Prefer choosing the primary 'Self' member if present, otherwise aggregate across all members with parents
  const selfMember =
    members.find(
      (m) => m.relationship_label.trim().toLowerCase() === "self"
    ) ||
    members.find((m) => m.mother_id || m.father_id) ||
    members[0];

  if (!selfMember) return [];

  const rollup = computeHereditaryRisks(selfMember.id, members, events);
  if (
    rollup.paternalAlerts.length > 0 ||
    rollup.maternalAlerts.length > 0
  ) {
    return [...rollup.paternalAlerts, ...rollup.maternalAlerts];
  }

  // Fallback: if no parent links exist yet, roll up all hereditary/allergy events across all family members
  const memberById = new Map(members.map((m) => [m.id, m]));
  const grouped = new Map<string, HereditaryConditionAlert>();

  for (const ev of events) {
    if (!ev.verified_by_user || (!ev.is_hereditary_flag && ev.event_type !== "allergy")) {
      continue;
    }
    const m = memberById.get(ev.member_id);
    if (!m) continue;

    const lowerRel = m.relationship_label.toLowerCase();
    const inferredLineage: LineageSide =
      lowerRel.includes("paternal") || lowerRel === "father"
        ? "Paternal Lineage"
        : lowerRel.includes("maternal") || lowerRel === "mother"
        ? "Maternal Lineage"
        : "Direct / Self";

    const key = `${inferredLineage}::${ev.title.trim().toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        conditionTitle: ev.title.trim(),
        eventType: ev.event_type,
        lineage: inferredLineage,
        relatives: [],
        formattedSummary: "",
      });
    }
    const item = grouped.get(key)!;
    if (!item.relatives.some((r) => r.memberId === m.id)) {
      item.relatives.push({
        memberId: m.id,
        fullName: m.full_name,
        relationshipLabel: m.relationship_label,
        generationDepth: 1,
        isDeceased: m.is_deceased,
      });
    }
  }

  for (const item of grouped.values()) {
    const labels = item.relatives.map((r) => r.relationshipLabel).join(", ");
    item.formattedSummary = `${item.lineage}: ${item.conditionTitle} (${labels})`;
  }

  return Array.from(grouped.values());
}
