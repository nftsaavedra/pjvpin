import React from "react";
import { usePublicacionesTab } from "./hooks/usePublicacionesTab";
import { PublicacionesListView } from "./components/PublicacionesListView";

interface PublicacionesTabProps {
  refreshTrigger?: number;
}

export const PublicacionesTab: React.FC<PublicacionesTabProps> = ({ refreshTrigger = 0 }) => {
  const state = usePublicacionesTab(refreshTrigger);
  return <PublicacionesListView state={state} />;
};
