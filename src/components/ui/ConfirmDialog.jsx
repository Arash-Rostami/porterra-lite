'use client';
import Modal from './Modal.jsx';
import { useConfirmState, answerConfirm } from '../../lib/confirm';
import { XCircleIcon, CheckIcon, TrashIcon } from './Icon.jsx';

// single instance in AppShell driven by confirm() store so all confirms reuse one Modal shell
export default function ConfirmDialog() {
  const s = useConfirmState();
  if (!s.open) return null;
  return (
    <Modal open onClose={() => answerConfirm(false)} title={s.title} width="sm"
      actions={
        <>
          <button type="button" className="crm-btn-ghost" onClick={() => answerConfirm(false)}><XCircleIcon />{s.cancelText}</button>
          <button type="button" className={s.tone === 'danger' ? 'crm-btn-danger' : 'crm-btn-primary'} onClick={() => answerConfirm(true)}>{s.tone === 'danger' ? <TrashIcon /> : <CheckIcon />}{s.confirmText}</button>
        </>
      }
    >
      <div className="crm-confirm-message">{s.message}</div>
    </Modal>
  );
}