import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { StudyPage } from '@/pages/StudyPage';
import { ExamPage } from '@/pages/ExamPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ReferencePage } from '@/pages/ReferencePage';

export default function App() {
  // Mount the theme effect once at the root.
  useTheme();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
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
