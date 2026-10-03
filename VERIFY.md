# EduSphere verification checklist

This package was reviewed after the feature update.

## Static checks completed

- Every backend `.js` module passes `node --check`.
- New assignment and timetable routes are registered in the Express server.
- New student/teacher/admin pages are registered in React Router.
- Seed data creates course-teacher assignments, timetable entries and sample coursework.
- Role checks were tightened so teachers can only modify courses explicitly assigned to them.
- Fee, marks, attendance and test inputs include server-side validation.
- Database indexes were added for common student/course queries.

## Runtime check

Run these commands on a machine with Node.js 20+ and network access for npm dependencies:

```bash
npm install
npm run seed
npm run dev
```

Then verify:

1. `http://localhost:4000/api/health` returns `{ "ok": true, ... }`.
2. Log in as admin, teacher and student using the demo credentials in `README.md`.
3. Admin → Operations: enroll students, assign teachers and create timetable entries.
4. Teacher → Notes/Attendance/Tests/Assignments: create course content.
5. Student → Notes/Attendance/Tests/Assignments/Timetable: confirm the same database data appears.
6. Admin → Activity: confirm actions are recorded.

## Important

A complete production deployment still requires HTTPS, a strong secret, backups, rate limiting, request-schema validation, object storage for uploads, monitoring, and a production database such as PostgreSQL for high concurrency.
