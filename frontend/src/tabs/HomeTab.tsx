import { APP_INFO } from "../constants/appInfo.js";
import type { getTranslations } from "../i18n/translations.js";
import type { AppSettings } from "../types/settings.js";

interface HomeTabProps {
  labels: ReturnType<typeof getTranslations>;
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => void;
}

export function HomeTab({ labels, settings, onChangeSettings }: HomeTabProps) {
  return (
    <main className="home-tab">
      <section className="home-hero">
        <div>
          <p className="eyebrow">{labels.home.title}</p>
          <h1>{APP_INFO.name}</h1>
          <p>{labels.home.description}</p>
        </div>
      </section>

      <section className="home-grid">
        <div className="panel home-panel">
          <h2>{labels.home.projectInfo}</h2>
          <dl className="home-info-list">
            <div>
              <dt>{labels.home.creator}</dt>
              <dd>{APP_INFO.creator}</dd>
            </div>
            <div>
              <dt>{labels.home.version}</dt>
              <dd>{APP_INFO.version}</dd>
            </div>
          </dl>
        </div>

        <div className="panel home-panel">
          <h2>{labels.home.language}</h2>
          <div className="segmented home-language" role="group" aria-label={labels.home.language}>
            <button
              type="button"
              className={settings.language === "en" ? "selected" : ""}
              onClick={() => onChangeSettings({ ...settings, language: "en" })}
            >
              {labels.english}
            </button>
            <button
              type="button"
              className={settings.language === "ko" ? "selected" : ""}
              onClick={() => onChangeSettings({ ...settings, language: "ko" })}
            >
              {labels.korean}
            </button>
          </div>
        </div>
      </section>

      <section className="panel home-panel">
        <h2>{labels.home.features}</h2>
        <div className="feature-list">
          {labels.home.featureItems.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
