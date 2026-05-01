interface HeaderProps {
  settingsLabel: string;
  infoLabel: string;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
}

export function Header({ settingsLabel, infoLabel, onOpenSettings, onOpenInfo }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-spacer" aria-hidden="true"></div>
      <div className="header-actions">
        <button type="button" className="secondary-button" onClick={onOpenSettings}>{settingsLabel}</button>
        <button type="button" className="secondary-button subtle" onClick={onOpenInfo}>{infoLabel}</button>
      </div>
    </header>
  );
}
