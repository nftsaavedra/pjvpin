import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { AppIcon } from "./shared/ui/AppIcon";
import { StatusChip } from "./shared/ui/StatusChip";
import { type Usuario } from "./features/auth/api";
import { ToastContainer } from "./shared/feedback/ToastContainer";
import { TabNavigation, type Tab } from "./shared/navigation/TabNavigation";
import { getRoleLabel, hasPermission, type AppPermission } from "./shared/auth/permissions";
import { AuthShell } from "./app/AuthShell";
import { TabRenderers } from "./app/TabRenderers";
import { AppLoadingScreen } from "./app/components/AppLoadingScreen";
import { TAB_DEFINITIONS, TAB_HEADER_META } from "./app/tabDefinitions";
import { useAuth } from "./app/hooks/useAuth";
import { useAutoRefresh } from "./app/hooks/useAutoRefresh";
import { WizardScreen } from "./features/wizard";
import { wizardHasConfig } from "@/shared/tauri/wizard";
import { messages } from "@/shared/feedback/messages";
import "@/assets/styles/index.css";

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedValue = window.localStorage.getItem("pjvpin.sidebarCollapsed");
    if (savedValue === "true" || savedValue === "false") {
      return savedValue === "true";
    }
    return window.innerWidth <= 1360 && window.innerWidth > 1024;
  });
  const [checkingWizard, setCheckingWizard] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const hasConfig = await wizardHasConfig();
        setShowWizard(!hasConfig);
      } catch {
        setShowWizard(true);
      } finally {
        setCheckingWizard(false);
      }
    };
    void check();
  }, []);

  const handleWizardDone = (_usuario: Usuario) => {
    window.location.reload();
  };

  const handleDataModified = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const {
    authLoading,
    currentUser,
    handleAuthenticated: baseHandleAuth,
    handleLogout: baseHandleLogout,
  } = useAuth();

  useAutoRefresh(currentUser, handleDataModified);

  const handleAuthenticated = (usuario: Usuario) => {
    baseHandleAuth(usuario);
    handleDataModified();
  };

  const handleLogout = async () => {
    await baseHandleLogout();
    setActiveTab("dashboard");
  };

  const currentRole = currentUser?.rol ?? null;

  const tabs: Tab[] = useMemo(
    () =>
      TAB_DEFINITIONS.filter((def) =>
        hasPermission(currentRole, def.permission as AppPermission),
      ).map((def) => ({
        id: def.id,
        label: def.label,
        icon: def.icon,
        description: def.description,
      })),
    [currentRole],
  );

  const validActiveTab =
    !currentUser || tabs.length === 0 || tabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : tabs[0].id;

  const activeTabMeta = tabs.find((tab) => tab.id === validActiveTab) ?? tabs[0];
  const activeHeaderMeta = TAB_HEADER_META[activeTabMeta.id] ?? TAB_HEADER_META.dashboard;

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("pjvpin.sidebarCollapsed", String(next));
      return next;
    });
  };

  if (checkingWizard) {
    return (
      <>
        <AppLoadingScreen subtitle={messages.shared.app.loadingSubtitleVerificandoConfig} />
        <ToastContainer />
      </>
    );
  }

  if (showWizard) {
    return (
      <div className="app-container">
        <WizardScreen onDone={handleWizardDone} />
        <ToastContainer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <>
        <AppLoadingScreen subtitle={messages.shared.app.loadingSubtitleVerificandoAcceso} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="app-container">
      {currentUser && (
        <a className="skip-link" href="#main-content">
          Saltar al contenido principal
        </a>
      )}
      {!currentUser ? (
        <AuthShell onAuthenticated={handleAuthenticated} />
      ) : (
        <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
          <aside id="app-sidebar" className="app-sidebar">
            <div className="sidebar-brand">
              <div className="sidebar-brand-mark">UPI</div>
              <div className="sidebar-brand-copy">
                <div className="sidebar-kicker">Research</div>
              </div>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={handleToggleSidebar}
                aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
                aria-controls="app-sidebar"
                aria-expanded={!sidebarCollapsed}
              >
                <AppIcon icon={sidebarCollapsed ? ChevronRight : ChevronLeft} size={18} />
              </button>
            </div>

            <TabNavigation
              tabs={tabs}
              activeTab={validActiveTab}
              onTabChange={setActiveTab}
              variant="sidebar"
              collapsed={sidebarCollapsed}
              ariaLabel="Navegación principal"
            />

            <div className="sidebar-footer">
              <div className="sidebar-user-card">
                <div className="sidebar-user-avatar">
                  {currentUser.nombre_completo?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="sidebar-user-copy">
                  <strong>{currentUser.nombre_completo ?? "Usuario"}</strong>
                  <span>@{currentUser.username}</span>
                  <small>{getRoleLabel(currentUser.rol)}</small>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary sidebar-logout"
                onClick={() => void handleLogout()}
              >
                <span className="sidebar-logout-icon">
                  <AppIcon icon={LogOut} size={18} />
                </span>
                <span className="sidebar-logout-label">Cerrar sesión</span>
              </button>
            </div>
          </aside>

          <div className="app-workspace">
            <header className="content-header">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[#526173] mb-2 text-[0.72rem] uppercase tracking-[0.18em] font-bold">
                  {activeHeaderMeta.kicker}
                </span>
                <div className="flex items-center gap-2 flex-wrap min-w-0 text-gray-500">
                  {activeTabMeta.icon && <AppIcon icon={activeTabMeta.icon} size={17} />}
                  <strong className="text-gray-800 text-base leading-none">
                    {activeHeaderMeta.title}
                  </strong>
                  <span className="text-gray-500 text-sm">{activeHeaderMeta.subtitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                <button
                  type="button"
                  className="content-sidebar-toggle"
                  onClick={handleToggleSidebar}
                  aria-label={
                    sidebarCollapsed
                      ? messages.shared.navigation.expandirNavegacion
                      : messages.shared.navigation.colapsarNavegacion
                  }
                  aria-controls="app-sidebar"
                  aria-expanded={!sidebarCollapsed}
                >
                  <span className="button-with-icon">
                    <AppIcon icon={sidebarCollapsed ? ChevronRight : ChevronLeft} size={18} />
                    <span>{messages.shared.navigation.menu}</span>
                  </span>
                </button>
                <StatusChip variant="total">Rol: {getRoleLabel(currentUser.rol)}</StatusChip>
              </div>
            </header>

            <main id="main-content" className="main-content main-content-shell" tabIndex={-1}>
              <TabRenderers
                validActiveTab={validActiveTab}
                currentUser={currentUser}
                currentRole={currentRole}
                refreshTrigger={refreshTrigger}
                onDataModified={handleDataModified}
              />
            </main>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default App;
