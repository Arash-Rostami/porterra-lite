'use client';
import { resetToSeed } from '../../lib/store';
import { SEED_DATA } from '../../data/seed.js';
import { confirm } from '../../lib/confirm';
import { toast } from '../ui/Toast.jsx';
import { ArrowPathIcon } from '../ui/Icon.jsx';

export default function Footer() {
  async function handleReset() {
    const ok = await confirm({
      title: 'بازگشت به داده اولیه',
      message: `همه سرنخ‌های تازه‌ای که اضافه شده حذف می‌شود و پنل به داده اولیه (${SEED_DATA.length.toLocaleString('en-US')} رکورد) برمی‌گردد. ادامه می‌دهید؟`,
      confirmText: 'بازگشت به داده اولیه',
      cancelText: 'انصراف',
    });
    if (!ok) return;
    resetToSeed();
    toast('پنل به داده اولیه بازگشت');
  }

  return (
    <div className="crm-footer">
      <div className="crm-footer-note">داده‌ها بین کاربران مشترک است؛ هر کاربر به‌طور پیش‌فرض فقط اطلاعات خود را می‌بیند و می‌تواند با «همه» همه را ببیند.</div>
      <button type="button" className="crm-reset-btn" onClick={handleReset}><ArrowPathIcon />بازگشت به داده اولیه</button>
    </div>
  );
}
