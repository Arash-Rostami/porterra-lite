'use client';
import Dropdown from './Dropdown.jsx';

const DEFAULT_PAGE_SIZE_OPTS = ['10', '20', '50', '100'];

export function paginate(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  return { pageItems: items.slice(start, start + perPage), totalPages, safePage };
}

export default function Pagination({ safePage, totalPages, onPage, perPage, onPerPage, perPageOptions }) {
  if (totalPages <= 1 && !onPerPage) return null;
  return (
    <div className="crm-pagination-row">
      {onPerPage && (
        <div className="crm-page-size">
          <span>تعداد نمایش در صفحه:</span>
          <Dropdown value={String(perPage)} onChange={(v) => onPerPage(parseInt(v, 10) || perPage)} options={perPageOptions || DEFAULT_PAGE_SIZE_OPTS} placeholder={String(perPage)} />
        </div>
      )}
      <div className="crm-pagination">
        <button className="crm-page-btn" disabled={safePage <= 1} onClick={() => onPage(safePage - 1)}>قبلی</button>
        <span className="crm-page-info">صفحه {safePage} از {totalPages}</span>
        <button className="crm-page-btn" disabled={safePage >= totalPages} onClick={() => onPage(safePage + 1)}>بعدی</button>
      </div>
    </div>
  );
}
