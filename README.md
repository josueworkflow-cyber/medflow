# MedFlow ERP

ERP para distribuidora hospitalar — Next.js + Prisma + PostgreSQL.

## Pré-requisitos

- Node.js 18+
- PostgreSQL

## Setup

```bash
npm install
cp .env.example .env  # configure DATABASE_URL e NEXTAUTH_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Credenciais de acesso

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | admin@medflow.com | admin123 |

> Crie usuários dos demais perfis (Vendas, Estoque, Financeiro) via painel admin após o login.
> 
> O seed (`prisma seed`) também popula os dados fiscais da empresa.

Open [http://localhost:3000](http://localhost:3000) com seu navegador.
