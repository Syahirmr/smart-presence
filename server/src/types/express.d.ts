import 'express';

declare global {
  namespace Express {
    // 🔥 FIXED: Tanpa export agar Declaration Merging sukses
    interface Request {
      admin?: {
        id: number; // 🔥 FIXED: Sesuai tipe INTEGER di database SQLite
        username: string;
        role: string;
      };
    }
  }
}

export {};