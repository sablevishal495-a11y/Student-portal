# EduSphere Institute Portal v3

## Windows setup (Node.js 24)

This version uses `better-sqlite3` 12.9.x, which has prebuilt Windows binaries for Node.js 24. You should not need to compile SQLite with Visual Studio for the normal Windows installation.

### 1. Requirements
- Windows 10/11 64-bit
- Node.js 24 LTS

Check:
```powershell
node -v
npm -v
```

### 2. Clean the failed installation (only if you already tried v2)
From the project root:
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force backend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
```

### 3. Install
```powershell
npm.cmd install
```
If PowerShell blocks `npm`, use `npm.cmd`.

### 4. Environment files
```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

### 5. Seed demo data
```powershell
npm.cmd run seed
```

### 6. Start
```powershell
npm.cmd run dev
```

Open http://localhost:5173

Backend: http://localhost:4000

## Demo accounts
- Admin: `admin@edusphere.local` / `Admin@12345`
- Teacher: `teacher@edusphere.local` / `Teacher@12345`
- Student: `student@edusphere.local` / `Student@12345`

## Important
Do not run `npm run seed` every time. It is for creating/resetting demo data.

## Architecture
React/Vite frontend -> Express REST API -> SQLite database. Student, Teacher and Super Admin dashboards share the same backend and database with JWT role-based authorization.
