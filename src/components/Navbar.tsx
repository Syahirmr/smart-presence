import { NavLink } from 'react-router-dom';
import { Camera, Home, UserPlus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/register', icon: UserPlus, label: 'Daftar' },
  { to: '/attendance', icon: Camera, label: 'Absensi' },
];

const Navbar = () => {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900/85 px-3 py-3 shadow-2xl backdrop-blur-xl">
      <div className="grid grid-cols-3 gap-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition',
                isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;