import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';

// Lazy loading membuat halaman dimuat hanya saat dibuka.
const Home = lazy(() => import('./pages/Home'));
const Register = lazy(() => import('./pages/Register'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Records = lazy(() => import('./pages/Records'));

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
            <Route path="/records" element={<Records />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
