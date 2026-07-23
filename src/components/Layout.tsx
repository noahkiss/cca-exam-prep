import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

/**
 * Shown while a lazy route chunk downloads. The min-height reserves roughly a
 * page worth of space so the footer doesn't jump up and then back down as the
 * real page swaps in.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/modules', label: 'Modules' },
  { to: '/study', label: 'Study' },
  { to: '/exam', label: 'Exam' },
  { to: '/review', label: 'Review' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/reference', label: 'Get Ahead' },
];

export function Layout() {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // On mobile the nav scrolls horizontally, so the current page's link can sit
  // off-screen (e.g. Dashboard when the row starts at Home). Bring the active
  // link into view on navigation so you can always see where you are.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm text-white">
              CCA
            </span>
            <span className="hidden text-slate-900 sm:inline dark:text-slate-100">
              Exam Prep
            </span>
          </NavLink>

          {/* min-w-0 is load-bearing: a flex child defaults to min-width:auto, so
              without it the nav refuses to shrink below its content and the last
              links run off the right edge instead of scrolling.
              The mask fades the right edge on mobile so the scroll cutoff reads
              as "more this way" instead of a link truncated mid-word. */}
          <nav
            ref={navRef}
            className="flex min-w-0 flex-1 scroll-px-3 items-center gap-1 overflow-x-auto scroll-smooth text-sm max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        Unofficial study aid for the Claude Certified Architect – Foundations exam. Not affiliated
        with Anthropic. All progress is stored locally in your browser.
      </footer>
    </div>
  );
}
