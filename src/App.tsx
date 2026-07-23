import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';

// Every route except Home is code-split. The question bank and module content
// are ~680 kB of JSON that only the drilling routes touch, so keeping them out
// of the entry chunk is the whole point — Home stays eager because it is the
// landing route and would otherwise pay an extra round trip to render.
const ModulesPage = lazy(() => import('@/pages/ModulesPage').then((m) => ({ default: m.ModulesPage })));
const ModulePage = lazy(() => import('@/pages/ModulePage').then((m) => ({ default: m.ModulePage })));
const StudyPage = lazy(() => import('@/pages/StudyPage').then((m) => ({ default: m.StudyPage })));
const ExamPage = lazy(() => import('@/pages/ExamPage').then((m) => ({ default: m.ExamPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReferencePage = lazy(() =>
  import('@/pages/ReferencePage').then((m) => ({ default: m.ReferencePage })),
);

export default function App() {
  // Mount the theme effect once at the root.
  useTheme();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/:id" element={<ModulePage />} />
        <Route path="study" element={<StudyPage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="reference" element={<ReferencePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
