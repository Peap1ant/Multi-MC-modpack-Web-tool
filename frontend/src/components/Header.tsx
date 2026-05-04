import { useEffect, useMemo, useRef, useState } from "react";
import type { AppTabId } from "../constants/tabs.js";

type HeaderMenuItem =
  | {
      type: "tab";
      id: AppTabId;
      label: string;
    }
  | {
      type: "category";
      id: string;
      label: string;
      children: Array<{
        id: AppTabId;
        label: string;
      }>;
    };

interface HeaderProps {
  menuLabel: string;
  currentTabLabel: string;
  menuItems: HeaderMenuItem[];
  activeTabId: AppTabId;
  settingsLabel: string;
  infoLabel: string;
  onSelectTab: (tabId: AppTabId) => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
}

export function Header({
  menuLabel,
  currentTabLabel,
  menuItems,
  activeTabId,
  settingsLabel,
  infoLabel,
  onSelectTab,
  onOpenSettings,
  onOpenInfo
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCategoryIds = useMemo(
    () => menuItems
      .filter((item) => item.type === "category" && item.children.some((child) => child.id === activeTabId))
      .map((item) => item.id),
    [activeTabId, menuItems]
  );

  useEffect(() => {
    if (menuOpen) {
      setExpandedCategories((current) => new Set([...current, ...activeCategoryIds]));
    }
  }, [activeCategoryIds, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleSelectTab(tabId: AppTabId) {
    onSelectTab(tabId);
    setMenuOpen(false);
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  return (
    <header className="site-header">
      <div className="header-menu" ref={menuRef}>
        <button
          type="button"
          className="secondary-button menu-button"
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuLabel}
        </button>
        {menuOpen && (
          <div className="tab-menu" role="menu" aria-label={menuLabel}>
            {menuItems.map((item) => {
              if (item.type === "tab") {
                return (
                  <button
                    type="button"
                    key={item.id}
                    role="menuitem"
                    className={item.id === activeTabId ? "selected" : ""}
                    aria-current={item.id === activeTabId ? "page" : undefined}
                    onClick={() => handleSelectTab(item.id)}
                  >
                    {item.label}
                  </button>
                );
              }

              const expanded = expandedCategories.has(item.id);
              const hasActiveChild = item.children.some((child) => child.id === activeTabId);
              return (
                <div className="tab-menu-category" key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={hasActiveChild ? "category-active" : ""}
                    aria-expanded={expanded}
                    onClick={() => toggleCategory(item.id)}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true">{expanded ? "v" : ">"}</span>
                  </button>
                  {expanded && (
                    <div className="tab-menu-children" role="group" aria-label={item.label}>
                      {item.children.map((child) => (
                        <button
                          type="button"
                          key={child.id}
                          role="menuitem"
                          className={child.id === activeTabId ? "selected" : ""}
                          aria-current={child.id === activeTabId ? "page" : undefined}
                          onClick={() => handleSelectTab(child.id)}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="header-current-tab" aria-live="polite">{currentTabLabel}</div>
      <div className="header-actions">
        <button type="button" className="secondary-button" onClick={onOpenSettings}>{settingsLabel}</button>
        <button type="button" className="secondary-button subtle" onClick={onOpenInfo}>{infoLabel}</button>
      </div>
    </header>
  );
}
