import { create } from 'zustand';

export type Student = {
  id: string;
  nim_nip: string;
  nama_lengkap: string;
  jurusan: string;
  face_enrolled: boolean;
};

const dummyStudents: Student[] = [
  { id: '1', nim_nip: '1301213001', nama_lengkap: 'Budi Santoso', jurusan: 'Informatika', face_enrolled: true },
  { id: '2', nim_nip: '1301213002', nama_lengkap: 'Siti Aminah', jurusan: 'Sistem Informasi', face_enrolled: true },
  { id: '3', nim_nip: '1301213003', nama_lengkap: 'Andi Wijaya', jurusan: 'Teknologi Informasi', face_enrolled: false },
  { id: '4', nim_nip: '1301213004', nama_lengkap: 'Dewi Lestari', jurusan: 'Informatika', face_enrolled: true },
  { id: '5', nim_nip: '1301213005', nama_lengkap: 'Rizky Pratama', jurusan: 'Data Science', face_enrolled: false },
];

type StudentStore = {
  students: Student[];
  setStudents: (students: Student[]) => void;
  deleteStudent: (id: string) => void;
};

export const useStudentStore = create<StudentStore>((set) => ({
  students: dummyStudents,
  setStudents: (students) => set({ students }),
  deleteStudent: (id) => set((state) => ({
    students: state.students.filter(s => s.id !== id)
  })),
}));
