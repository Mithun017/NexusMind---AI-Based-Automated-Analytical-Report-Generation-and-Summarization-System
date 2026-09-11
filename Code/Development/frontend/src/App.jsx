import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './features/layout/Layout';
import HomePage from './features/pages/HomePage';
import DashboardPage from './features/pages/DashboardPage';
import HistoryPage from './features/pages/HistoryPage';
import ReportPage from './features/pages/ReportPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard/:analysisId" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/report/:reportId" element={<ReportPage />} />
      </Routes>
    </Layout>
  );
}
