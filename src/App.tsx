import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import AdminProtectedRoute from './components/AdminProtectedRoute';

const Home = lazy(() => import('./pages/Home'));
const Register = lazy(() => import('./pages/Register'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Records = lazy(() => import('./pages/Records'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

function App() {
  return (
    <Router>
      <Layout>
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="glass-card px-5 py-4 text-sm text-slate-300">
                Memuat halaman...
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/attendance" element={<Attendance />} />

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route
              path="/admin/records"
              element={
                <AdminProtectedRoute>
                  <Records />
                </AdminProtectedRoute>
              }
            />

            <Route path="/records" element={<Navigate to="/admin/records" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;