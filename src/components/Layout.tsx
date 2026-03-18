import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      {/* Ornamen latar hanya dekorasi, jadi pointer events dimatikan. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-32 md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {children}
        </motion.div>
      </main>

      <Navbar />
    </div>
  );
};

export default Layout;
