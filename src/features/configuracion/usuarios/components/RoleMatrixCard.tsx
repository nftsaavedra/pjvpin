import React from "react";

interface RoleMatrixCardProps {
  label: string;
  summary: string;
  kicker?: string;
  capabilities: readonly string[];
  isActive: boolean;
}

export const RoleMatrixCard: React.FC<RoleMatrixCardProps> = ({
  label,
  summary,
  kicker = "Rol operativo",
  capabilities,
  isActive,
}) => (
  <article
    className={`module-aside-card role-matrix-card ${isActive ? "role-matrix-card-active" : ""}`}
  >
    <span className="module-aside-kicker">{kicker}</span>
    <strong>{label}</strong>
    <p>{summary}</p>
    <div className="role-matrix-list">
      {capabilities.map((capability) => (
        <span key={capability} className="role-matrix-item">
          {capability}
        </span>
      ))}
    </div>
  </article>
);
