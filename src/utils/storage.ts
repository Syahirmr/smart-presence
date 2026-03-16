export interface FaceRegistration {
    id: string;
    name: string;
    descriptor: number[];
}

export interface AttendanceRecord {
    id: string;
    name: string;
    timestamp: string;
    date: string;
}

const STORAGE_KEYS = {
    REGISTRATIONS: 'face_attendance_registrations',
    ATTENDANCE: 'face_attendance_records',
};

export const saveRegistration = (registration: FaceRegistration) => {
    const registrations = getRegistrations();
    registrations.push(registration);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
};

export const getRegistrations = (): FaceRegistration[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    return data ? JSON.parse(data) : [];
};

export const saveAttendance = (name: string, id: string) => {
    const attendance = getAttendance();
    const now = new Date();
    const record: AttendanceRecord = {
        id,
        name,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
    };
    attendance.push(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
};

export const getAttendance = (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
};

export const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
};

export const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
