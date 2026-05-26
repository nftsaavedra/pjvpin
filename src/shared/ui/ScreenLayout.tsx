import React from "react";

interface ScreenLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ header, children }) => (
  <div className="screen-layout">
    {header}
    <div className="screen-body">{children}</div>
  </div>
);
