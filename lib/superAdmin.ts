import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

let bootstrapped = false;

export function getSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL || 'priyojitghosh10539@gmail.com')
    .toLowerCase()
    .trim();
}

export async function ensureSuperAdmin(): Promise<void> {
  if (bootstrapped) return;

  const email = getSuperAdminEmail();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;

  await connectDB();

  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      name: 'Priyojit Ghosh (Super Admin)',
      email,
      passwordHash,
      role: 'super_admin',
      provider: 'credentials',
    });
  } else if (existing.role !== 'super_admin' || !existing.passwordHash) {
    existing.role = 'super_admin';
    if (!existing.passwordHash) {
      existing.passwordHash = await bcrypt.hash(password, 10);
    }
    await existing.save();
  }

  bootstrapped = true;
}
