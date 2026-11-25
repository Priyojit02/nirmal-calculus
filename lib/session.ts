import { connectDB } from '@/lib/mongodb';
import { getUser, MAX_ACTIVE_DEVICES } from '@/lib/auth';
import { User } from '@/models/User';
import type { AuthUser } from '@/types';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createDeviceSession(
  userId: string,
  userAgent: string
): Promise<string> {
  await connectDB();
  const jti = crypto.randomUUID();
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);

  // Remove expired sessions first
  await User.updateOne(
    { _id: userId },
    { $pull: { activeSessions: { createdAt: { $lt: cutoff } } } }
  );

  // Push new session and keep only the latest MAX_ACTIVE_DEVICES (2) sessions
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        activeSessions: {
          $each: [
            {
              jti,
              userAgent: userAgent.slice(0, 120) || 'Unknown device',
              createdAt: new Date(),
            },
          ],
          $slice: -MAX_ACTIVE_DEVICES,
        },
      },
    }
  );

  return jti;
}

export async function revokeDeviceSession(
  userId: string,
  jti?: string
): Promise<void> {
  if (!jti) return;
  await connectDB();
  await User.updateOne(
    { _id: userId },
    { $pull: { activeSessions: { jti } } }
  );
}

export async function getActiveUser(req?: Request): Promise<AuthUser | null> {
  const user = await getUser(req);
  if (!user || !user.jti) return null;

  await connectDB();
  const dbUser = await User.findById(user.id)
    .select('activeSessions role name email')
    .lean();

  if (!dbUser) return null;

  const isActive = (dbUser.activeSessions || []).some(
    (s) => s.jti === user.jti
  );
  if (!isActive) return null;

  return {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    jti: user.jti,
  };
}
