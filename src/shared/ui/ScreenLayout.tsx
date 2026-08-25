import React from "react";

interface ScreenLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ header, children, footer }) => (
  <div className="screen-layout">
    {header}
    <div className="screen-body">{children}</div>
    {footer && <div className="screen-footer">{footer}</div>}
  </div>
);
