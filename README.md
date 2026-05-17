Academic Evaluation MVP

## Backend

```bash
cd backend
npm install
npm run db:init
npm run db:seed
npm run dev
```

The backend runs at `http://localhost:4000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Seeded accounts

```txt
teacher@example.com  / password123
student1@example.com / password123
student2@example.com / password123
student3@example.com / password123
```

## Current MVP scope

- Teacher and student login.
- Teacher assignment creation with individual/team mode.
- Teacher selected student participants.
- Custom evaluation criteria per assignment.
- Open/closed assignment status.
- Student team creation for team assignments.
- Student submission using notes and file URL/reference.
- Teacher evaluation using assignment criteria.
