import React from "react";
import { Badge } from "@/shared/ui/Badge";

interface RoleMatrixCardProps {
  label: string;
  summary: string;
  modules: readonly string[];
  isActive: boolean;
}

export const RoleMatrixCard: React.FC<RoleMatrixCardProps> = ({
  label,
  summary,
  modules,
  isActive,
}) => (
  <article
    className={`module-aside-card role-matrix-card ${isActive ? "role-matrix-card-active" : ""}`}
  >
    <strong>{label}</strong>
    <p>{summary}</p>
    <div className="role-matrix-modules">
      {modules.map((moduleName) => (
        <Badge key={moduleName} variant="default">
          {moduleName}
        </Badge>
      ))}
    </div>
  </article>
);
