import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import {
  ensureDefaultAdmin,
  findAdminByUsername,
} from './admin-auth.repository.js';
import type { AdminLoginBody } from './admin-auth.schema.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = '8h';

type SeedDefaultAdminInput = {
  username: string;
  password: string;
};

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

  return {
    token,
    token_type: 'Bearer',
    admin: {
      id: admin.id,
      username: admin.username,
    },
  };
}