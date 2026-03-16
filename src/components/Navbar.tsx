import { NavLink } from 'react-router-dom';
import { Camera, UserPlus, ClipboardList, Home } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Navbar = () => {
    const navItems = [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/register', icon: UserPlus, label: 'Daftarkan Wajah' },
        { to: '/attendance', icon: Camera, label: 'Ambil Presensi' },
        { to: '/records', icon: ClipboardList, label: 'Rekap' },
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 glass-card flex items-center gap-8 shadow-2xl">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center gap-1 transition-all duration-300 group",
                            isActive ? "text-blue-400 scale-110" : "text-slate-400 hover:text-slate-200"
                        )
                    }
                >
                    <Icon size={24} className="group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default Navbar;
