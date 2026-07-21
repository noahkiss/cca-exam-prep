import type { Domain } from '@/types';
import { DOMAIN_BY_ID } from '@/types';
import { DOMAIN_STYLES } from '@/lib/domainStyles';

export function DomainBadge({ domain, full = false }: { domain: Domain; full?: boolean }) {
  const meta = DOMAIN_BY_ID[domain];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DOMAIN_STYLES[domain].badge}`}
      title={meta.name}
    >
      {full ? meta.name : meta.short}
    </span>
  );
}
