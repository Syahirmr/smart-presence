import { motion } from 'framer-motion';
import { ArrowRight, Camera, ClipboardList, ScanFace, ShieldCheck, UserPlus, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const cards = [
  {
    title: 'Daftarkan Wajah',
    desc: 'Tambahkan pengguna baru dengan proses registrasi wajah yang cepat dan terstruktur.',
    icon: UserPlus,
    to: '/register',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    title: 'Ambil Absensi',
    desc: 'Tandai kehadiran harian melalui pengenalan wajah secara instan.',
    icon: Camera,
    to: '/attendance',
    color: 'from-indigo-500 to-purple-400',
  },
  {
    title: 'Lihat Riwayat',
    desc: 'Pantau, filter, dan ekspor catatan absensi yang sudah tersimpan.',
    icon: ClipboardList,
    to: '/records',
    color: 'from-emerald-500 to-teal-400',
  },
];

const stats = [
  {
    title: 'Responsif',
    value: 'Mobile First',
    icon: ScanFace,
  },
  {
    title: 'Keamanan Data',
    value: 'Local Storage',
    icon: ShieldCheck,
  },
  {
    title: 'Pengalaman',
    value: 'Cepat & Ringan',
    icon: Zap,
  },
];

const Home = () => {
  return (
    <div className="page-shell">
      <header className="page-header">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card panel-padding"
        >
          <div className="mx-auto max-w-4xl space-y-5 text-center">
            <p className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
              Smart Presence Dashboard
            </p>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Sistem <span className="gradient-text">Pengenalan Wajah</span>
              <br className="hidden sm:block" /> untuk Absensi
            </h1>

            <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base md:text-lg">
              Kelola registrasi wajah, pencatatan kehadiran, dan riwayat absensi dalam satu antarmuka yang rapi,
              cepat, dan mudah digunakan di berbagai perangkat.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary w-full sm:w-auto">
                Mulai Registrasi
                <ArrowRight size={18} />
              </Link>
              <Link to="/attendance" className="btn-secondary w-full sm:w-auto">
                Buka Absensi
              </Link>
            </div>
          </div>
        </motion.div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map(({ title, value, icon: Icon }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass-card panel-padding"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">{title}</p>
                <h2 className="text-lg font-semibold text-slate-100">{value}</h2>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
          >
            <Link to={card.to} className="group block h-full">
              <article className="glass-card panel-padding flex h-full flex-col gap-4 border-white/5 transition hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10">
                <div className={`w-fit rounded-2xl bg-gradient-to-br p-3 shadow-lg shadow-black/20 ${card.color}`}>
                  <card.icon size={24} className="text-white" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-100">{card.title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{card.desc}</p>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2 text-sm font-medium text-blue-300 transition group-hover:gap-3">
                  <span>Buka Menu</span>
                  <ArrowRight size={16} />
                </div>
              </article>
            </Link>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default Home;
