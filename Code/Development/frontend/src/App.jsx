import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './features/layout/Layout';
import HomePage from './features/pages/HomePage';
import DashboardPage from './features/pages/DashboardPage';
import HistoryPage from './features/pages/HistoryPage';
import GraphPage from './features/pages/GraphPage';
import DiagnosticsPage from './features/pages/DiagnosticsPage';
import ModelsPage from './features/pages/ModelsPage';
import AuditPage from './features/pages/AuditPage';
import DocsPage from './features/pages/DocsPage';
import ReportPage from './features/pages/ReportPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Core Studio */}
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/:analysisId" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />

        {/* Advanced Analytics */}
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/graph/:analysisId" element={<GraphPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/diagnostics/:analysisId" element={<DiagnosticsPage />} />

        {/* Intelligence & System */}
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/docs" element={<DocsPage />} />

        {/* Reports */}
        <Route path="/report/:reportId" element={<ReportPage />} />
      </Routes>
    </Layout>
  );
}
