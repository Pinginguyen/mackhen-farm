import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const password = 'AdminMHF@2026!';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@mackhenfarm.vn' },
    update: {
      password: passwordHash,
      role: 'ADMIN'
    },
    create: {
      email: 'admin@mackhenfarm.vn',
      name: 'Quản Trị Viên Mắc Khén',
      password: passwordHash,
      role: 'ADMIN'
    }
  });

  console.log('--------------------------------------------------');
  console.log('🎉 ĐÃ TẠO VÀ KÍCH HOẠT TÀI KHOẢN ADMIN THÀNH CÔNG!');
  console.log('📧 Email:', user.email);
  console.log('🔑 Mật khẩu:', password);
  console.log('🛡️ Vai trò (Role):', user.role);
  console.log('--------------------------------------------------');
}

run()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
