import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Camera, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const cards = [
        {
            title: 'Daftarkan Wajah',
            desc: 'Daftarkan pengguna baru dengan merekam fitur wajah unik mereka.',
            icon: UserPlus,
            to: '/register',
            color: 'from-blue-500 to-cyan-400'
        },
        {
            title: 'Ambil Absensi',
            desc: 'Tandai absensi harian secara instan menggunakan pengenalan wajah.',
            icon: Camera,
            to: '/attendance',
            color: 'from-indigo-500 to-purple-400'
        },
        {
            title: 'Lihat Riwayat',
            desc: 'Pantau dan ekspor riwayat absensi dengan catatan yang detail.',
            icon: ClipboardList,
            to: '/records',
            color: 'from-emerald-500 to-teal-400'
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                <motion.h1
                    className="text-5xl md:text-7xl font-bold tracking-tight"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    Sistem <span className="gradient-text">Pengenalan Wajah</span>
                    <br /> untuk Absensi
                </motion.h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                   PPL jadi sebelum lebaran please fix 100%
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Link to={card.to} className="group block h-full">
                            <div className="h-full p-8 glass-card border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-start space-y-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-black/20`}>
                                    <card.icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-semibold">{card.title}</h3>
                                <p className="text-slate-400 text-sm flex-grow">{card.desc}</p>
                                <div className="pt-4 flex items-center gap-2 text-blue-400 font-medium group-hover:gap-3 transition-all">
                                    <span>Mulai Sekarang</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Home;