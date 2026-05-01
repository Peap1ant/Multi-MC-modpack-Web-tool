import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, closeLabel, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button neutral" onClick={onClose} aria-label={closeLabel}>×</button>
        </div>
        {children}
      </section>
    </div>
  );
}
