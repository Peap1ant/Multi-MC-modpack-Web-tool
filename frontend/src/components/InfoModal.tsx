import { APP_INFO } from "../constants/appInfo.js";
import type { getTranslations } from "../i18n/translations.js";
import { Modal } from "./Modal.js";

interface InfoModalProps {
  labels: ReturnType<typeof getTranslations>;
  onClose: () => void;
}

export function InfoModal({ labels, onClose }: InfoModalProps) {
  return (
    <Modal title={labels.info} closeLabel={labels.close} onClose={onClose}>
      <dl className="info-list">
        <div><dt>{labels.creator}</dt><dd>{APP_INFO.creator}</dd></div>
        <div><dt>{labels.version}</dt><dd>{APP_INFO.version}</dd></div>
        <div>
          <dt>{labels.repository}</dt>
          <dd><a href={APP_INFO.repositoryUrl} target="_blank" rel="noreferrer">{APP_INFO.repositoryUrl}</a></dd>
        </div>
      </dl>
      <p className="modal-note">{labels.aiMessage}</p>
    </Modal>
  );
}
