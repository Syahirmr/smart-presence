import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import {
  ensureDefaultAdmin,
  findAdminById,
  findAdminByUsername,
  updateAdminPasswordHash,
} from './admin-auth.repository.js';
import type { ChangeAdminPasswordBody } from './change-password.schema.js';
import type { AdminLoginBody } from './admin-auth.schema.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = '8h';

type SeedDefaultAdminInput = {
  username: string;
  password: string;
};

function parseAdminId(adminId: string) {
  const parsedAdminId = Number(adminId);

  if (!Number.isInteger(parsedAdminId) || parsedAdminId <= 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token admin tidak valid');
  }

  return parsedAdminId;
}

export async function seedDefaultAdmin(input: SeedDefaultAdminInput) {
  const username = input.username.trim();
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  return ensureDefaultAdmin({
    username,
    passwordHash,
  });
}

export async function loginAdmin(input: AdminLoginBody) {
  const username = input.username.trim();

  const admin = findAdminByUsername(username);

  if (!admin) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau password salah');
  }

  const isPasswordValid = await bcrypt.compare(input.password, admin.password_hash);

  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau password salah');
  }

  const token = jwt.sign(
    {
      sub: String(admin.id),
      username: admin.username,
      role: 'admin',
    },
    env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN,
    },
  );

    const mustChangePassword = await bcrypt.compare(
    env.DEFAULT_ADMIN_PASSWORD,
    admin.password_hash,
  );

  return {
    token,
    token_type: 'Bearer',
    admin: {
      id: admin.id,
      username: admin.username,
    },
    must_change_password: mustChangePassword,
  };
}

export async function changeAdminPassword(
  adminIdFromToken: string,
  input: ChangeAdminPasswordBody,
) {
  const adminId = parseAdminId(adminIdFromToken);

  const admin = findAdminById(adminId);

  if (!admin) {
    throw new AppError(404, 'ADMIN_NOT_FOUND', 'Admin tidak ditemukan');
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.current_password,
    admin.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Password saat ini salah');
  }

  const newPasswordHash = await bcrypt.hash(input.new_password, SALT_ROUNDS);

  const result = updateAdminPasswordHash(adminId, newPasswordHash);

  if (!result.updated) {
    throw new AppError(
      500,
      'ADMIN_PASSWORD_UPDATE_FAILED',
      'Gagal mengubah password admin',
    );
  }

  return {
    admin: {
      id: admin.id,
      username: admin.username,
    },
  };
}