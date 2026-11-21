import React from "react";
import { Dna } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { HereditaryConditionAlert } from "@/lib/hereditary/computeRisks";

interface HereditaryRiskBannerProps {
  alerts: HereditaryConditionAlert[];
  subjectName?: string;
  compact?: boolean;
}

export function HereditaryRiskBanner({
  alerts,
  subjectName = "Family Lineage",
  compact = false,
}: HereditaryRiskBannerProps) {
  const paternalAlerts = alerts.filter((a) => a.lineage === "Paternal Lineage");
  const maternalAlerts = alerts.filter((a) => a.lineage === "Maternal Lineage");
  const directAlerts = alerts.filter((a) => a.lineage === "Direct / Self");

  if (alerts.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Dna className="h-4 w-4 text-primary" />
          <span>No Hereditary Risks Recorded</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Link parents when adding family members and verify medical records to
          see hereditary patterns across generations.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Dna className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Hereditary Risk Summary — {subjectName}
            </h2>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                Conditions identified across up to 3 generations
              </p>
            )}
          </div>
        </div>
        <Badge variant="secondary">
          {alerts.length} condition{alerts.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Paternal Side */}
        <div className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paternal Side
          </h3>

          {paternalAlerts.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No hereditary conditions recorded on paternal side.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {paternalAlerts.map((alert) => (
                <li
                  key={`${alert.lineage}-${alert.conditionTitle}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{alert.conditionTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {alert.relatives
                        .map((r) => `${r.relationshipLabel} (${r.fullName})`)
                        .join(" • ")}
                    </p>
                  </div>
                  {alert.eventType === "allergy" && (
                    <Badge variant="destructive">Allergy</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Maternal Side */}
        <div className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Maternal Side
          </h3>

          {maternalAlerts.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No hereditary conditions recorded on maternal side.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {maternalAlerts.map((alert) => (
                <li
                  key={`${alert.lineage}-${alert.conditionTitle}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{alert.conditionTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {alert.relatives
                        .map((r) => `${r.relationshipLabel} (${r.fullName})`)
                        .join(" • ")}
                    </p>
                  </div>
                  {alert.eventType === "allergy" && (
                    <Badge variant="destructive">Allergy</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {directAlerts.length > 0 && !compact && (
        <div className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Personal flags: </span>
          {directAlerts.map((d) => d.conditionTitle).join(", ")}
        </div>
      )}
    </Card>
  );
}
