import { Link } from 'react-router-dom';
import { REFERENCE_BY_ID } from '@/data/reference';

/** Deep-links to a principle/gotcha entry on the reference page. */
export function ReferenceLink({ id }: { id: string }) {
  const entry = REFERENCE_BY_ID[id];
  if (!entry) return null;
  return (
    <Link
      to={`/reference#${id}`}
      className="inline-flex items-center gap-1 font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-500 dark:text-indigo-400 dark:decoration-indigo-500/50"
    >
      {entry.title}
      <span aria-hidden>↗</span>
    </Link>
  );
}
