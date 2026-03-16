import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Records from './pages/Records';
import { useEffect } from 'react';
import { loadModels } from './utils/faceApi';

function App() {
  useEffect(() => {
    loadModels();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/records" element={<Records />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
