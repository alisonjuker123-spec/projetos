# SaiEscola — Sistema de Retirada de Alunos

SaaS prototype for managing school student pickups in real time.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3, synchronous)
- **Real-time**: Socket.io
- **Auth**: JWT

## Quick Start

### 1. Install Backend

```bash
cd backend
npm install
```

### 2. Seed the Database

```bash
cd backend
npm run seed
```

### 3. Start Backend

```bash
cd backend
npm start
# or for dev with auto-restart:
npm run dev
```

Backend runs on: http://localhost:3001

### 4. Install Frontend

```bash
cd frontend
npm install
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Test Credentials (all passwords: `123456`)

| Role       | Email                   | Name              |
|------------|-------------------------|-------------------|
| Pai        | pai@teste.com           | João Silva        |
| Professora | professora@teste.com    | Ana Lima          |
| Portão     | portao@teste.com        | Supervisora Ana   |
| Admin      | admin@teste.com         | Diretor Pedro     |

---

## User Flow

1. **Pai** arrives at school, logs in, and clicks "Chegou para buscar" for each child
2. **Professora** receives a real-time notification and clicks "Liberar" to release the student
3. **Portão** sees the student listed as "A Caminho" and clicks "Confirmar Saída" when the student leaves
4. **Admin** can see all students and today's pickup history in real time

## Status Flow

```
na_escola → responsavel_chegou → liberado → saiu
```

## Project Structure

```
saiescola/
  backend/       Node.js + Express API
  frontend/      React + Vite SPA
```
