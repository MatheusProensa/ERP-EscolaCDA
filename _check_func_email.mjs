import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const funcs = await prisma.funcionario.findMany({ select: { nome: true, email: true, cargo: true }, orderBy: { nome: 'asc' } });
console.log('=== COM email ===');
for (const f of funcs.filter(f => f.email)) console.log(f.nome, '|', f.cargo, '|', f.email);
console.log('\n=== SEM email ===');
for (const f of funcs.filter(f => !f.email)) console.log(f.nome, '|', f.cargo);
await prisma.$disconnect();
