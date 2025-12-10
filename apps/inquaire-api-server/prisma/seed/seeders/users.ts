import * as bcrypt from 'bcrypt';

import type { PrismaClient, User } from '../../generated';

export async function seedUsers(prisma: PrismaClient): Promise<User[]> {
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123!', 10);

  // Admin user
  await prisma.user.create({
    data: {
      email: 'admin@inquaire.com',
      password_hash: hashedPassword,
      name: '관리자',
      role: 'SUPER_ADMIN',
      last_login_at: new Date(),
    },
  });

  // Regular users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'kim@dental.com',
        password_hash: hashedPassword,
        name: '김철수',
        role: 'USER',
        last_login_at: new Date(Date.now() - 1000 * 60 * 30),
      },
    }),
    prisma.user.create({
      data: {
        email: 'lee@derma.com',
        password_hash: hashedPassword,
        name: '이영희',
        role: 'USER',
        last_login_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    }),
    prisma.user.create({
      data: {
        email: 'park@estate.com',
        password_hash: hashedPassword,
        name: '박민수',
        role: 'USER',
        last_login_at: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    }),
    prisma.user.create({
      data: {
        email: 'choi@hospital.com',
        password_hash: hashedPassword,
        name: '최지훈',
        role: 'USER',
        last_login_at: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
    }),
    prisma.user.create({
      data: {
        email: 'jung@salon.com',
        password_hash: hashedPassword,
        name: '정미영',
        role: 'USER',
        last_login_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length + 1} users`);
  return users;
}
