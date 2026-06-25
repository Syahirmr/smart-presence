import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

type RecordType = {
  id: string;
  status: string;
  date: string;
};

type Props = {
  records?: RecordType[];
};

export default function AttendanceCharts({ records = [] }: Props) {
  const pieData = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpha = 0;
    
    records.forEach(r => {
      const s = r.status.toUpperCase();
      if (s === 'HADIR' || s === 'DUPLICATE') hadir++;
      else if (s === 'SAKIT') sakit++;
      else if (s === 'IZIN') izin++;
      else if (s === 'ALPHA') alpha++;
    });

    const total = hadir + sakit + izin + alpha;
    if (total === 0) {
      return [
        { name: 'Belum Ada Data', value: 1, color: '#475569' } // slate-600
      ];
    }

    return [
      { name: 'Hadir', value: hadir, color: '#10b981' }, // emerald-500
      { name: 'Sakit', value: sakit, color: '#3b82f6' }, // blue-500
      { name: 'Izin', value: izin, color: '#a855f7' }, // purple-500
      { name: 'Alpha', value: alpha, color: '#ef4444' }, // red-500
    ].filter(d => d.value > 0);
  }, [records]);

  const barData = useMemo(() => {
    if (!records.length) {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const offset = d.getTimezoneOffset() * 60000;
        const dayName = new Date(d.getTime() - offset).toLocaleDateString('id-ID', { weekday: 'short' });
        result.push({ day: dayName, hadir: 0 });
      }
      return result;
    }

    const countsByDate: Record<string, number> = {};
    const uniqueDates = new Set<string>();
    
    records.forEach(r => {
      if (r.date && r.date !== '-') {
        uniqueDates.add(r.date);
        const s = r.status.toUpperCase();
        if (s === 'HADIR' || s === 'DUPLICATE') {
          countsByDate[r.date] = (countsByDate[r.date] || 0) + 1;
        }
      }
    });

    const sortedDates = Array.from(uniqueDates).sort((a, b) => a.localeCompare(b));
    const last7Dates = sortedDates.slice(-7);

    return last7Dates.map(dateStr => {
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      return {
        day: dayName,
        hadir: countsByDate[dateStr] || 0
      };
    });
  }, [records]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card panel-padding relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px] pointer-events-none" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Persentase Kehadiran (Sesuai Filter)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="rgba(255,255,255,0.05)"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#f1f5f9', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs font-medium">
          {pieData.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300">{entry.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card panel-padding relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-blue-500/10 blur-[50px] pointer-events-none" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Tren Kehadiran (Sesuai Filter)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#60a5fa', fontWeight: 600 }}
              />
              <Bar dataKey="hadir" name="Kehadiran" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
