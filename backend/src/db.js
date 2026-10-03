import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url), __dirname=path.dirname(__filename);
const dataDir=path.join(__dirname,"../data");fs.mkdirSync(dataDir,{recursive:true});
export const db=new Database(path.join(dataDir,"institute.db"));
db.pragma("foreign_keys = ON");db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,role TEXT NOT NULL CHECK(role IN ('ADMIN','TEACHER','STUDENT')),name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,phone TEXT DEFAULT '',is_active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL UNIQUE,roll_no TEXT NOT NULL UNIQUE,course TEXT NOT NULL,semester INTEGER NOT NULL DEFAULT 1,section TEXT NOT NULL DEFAULT 'A',FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS teachers(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL UNIQUE,employee_code TEXT NOT NULL UNIQUE,department TEXT NOT NULL,designation TEXT NOT NULL DEFAULT 'Faculty',FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS courses(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,department TEXT NOT NULL,semester INTEGER NOT NULL DEFAULT 1,section TEXT NOT NULL DEFAULT 'A');
CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL,course_id INTEGER NOT NULL,UNIQUE(student_id,course_id),FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS course_teachers(id INTEGER PRIMARY KEY AUTOINCREMENT,course_id INTEGER NOT NULL,teacher_id INTEGER NOT NULL,UNIQUE(course_id,teacher_id),FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS timetable(id INTEGER PRIMARY KEY AUTOINCREMENT,course_id INTEGER NOT NULL,teacher_id INTEGER,day_of_week TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,room TEXT DEFAULT '',notes TEXT DEFAULT '',FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS assignments(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT DEFAULT '',course_id INTEGER NOT NULL,teacher_id INTEGER,due_date TEXT NOT NULL,max_marks REAL NOT NULL DEFAULT 10,status TEXT NOT NULL DEFAULT 'PUBLISHED',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS assignment_submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,assignment_id INTEGER NOT NULL,student_id INTEGER NOT NULL,submission_text TEXT NOT NULL,score REAL,feedback TEXT DEFAULT '',submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,graded_at TEXT,UNIQUE(assignment_id,student_id),FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL,course_id INTEGER NOT NULL,date TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('PRESENT','ABSENT','LATE')),marked_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,course_id,date),FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(marked_by) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT DEFAULT '',subject TEXT NOT NULL,course_id INTEGER,teacher_id INTEGER,file_name TEXT NOT NULL,file_url TEXT NOT NULL,uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE SET NULL,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS tests(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT DEFAULT '',course_id INTEGER NOT NULL,teacher_id INTEGER,duration_minutes INTEGER NOT NULL DEFAULT 30,total_marks INTEGER NOT NULL DEFAULT 0,questions_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,test_id INTEGER NOT NULL,student_id INTEGER NOT NULL,answers_json TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(test_id,student_id),FOREIGN KEY(test_id) REFERENCES tests(id) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS fees(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL,fee_type TEXT NOT NULL,amount REAL NOT NULL,paid_amount REAL NOT NULL DEFAULT 0,due_date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',reference TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS marks(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL,course_id INTEGER NOT NULL,subject TEXT NOT NULL,assessment TEXT NOT NULL,score REAL NOT NULL,max_score REAL NOT NULL,term TEXT NOT NULL DEFAULT 'Current',teacher_id INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,message TEXT NOT NULL,audience TEXT NOT NULL DEFAULT 'ALL',created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS activities(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,entity TEXT NOT NULL,entity_id INTEGER,details TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id,date);
CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course_id);
CREATE INDEX IF NOT EXISTS idx_tests_course ON tests(course_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_due ON assignments(course_id,due_date);
CREATE INDEX IF NOT EXISTS idx_timetable_course_day ON timetable(course_id,day_of_week);
`);
export function logActivity(userId,action,entity,entityId=null,details=""){db.prepare(`INSERT INTO activities(user_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)`).run(userId??null,action,entity,entityId,details)}
export function getStudentByUserId(userId){return db.prepare(`SELECT s.*,u.name,u.email,u.phone FROM students s JOIN users u ON u.id=s.user_id WHERE s.user_id=?`).get(userId)}
export function getTeacherByUserId(userId){return db.prepare(`SELECT t.*,u.name,u.email,u.phone FROM teachers t JOIN users u ON u.id=t.user_id WHERE t.user_id=?`).get(userId)}
