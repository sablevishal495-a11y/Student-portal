import express from "express";
import { db, getStudentByUserId, getTeacherByUserId, logActivity } from "../db.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = express.Router();

function teacherCanManage(courseId, teacherId) {
  return !!db.prepare(`SELECT 1 FROM course_teachers WHERE course_id=? AND teacher_id=?`).get(Number(courseId), Number(teacherId));
}

router.get("/", authRequired, (req, res) => {
  if (req.user.role === "STUDENT") {
    const s = getStudentByUserId(req.user.id);
    const assignments = db.prepare(`
      SELECT a.id,a.title,a.description,a.due_date,a.max_marks,a.status,a.created_at,
             c.code,c.name course_name,u.name teacher_name,
             sub.id submission_id,sub.score,sub.feedback,sub.submitted_at
      FROM assignments a
      JOIN courses c ON c.id=a.course_id
      JOIN enrollments e ON e.course_id=a.course_id AND e.student_id=?
      LEFT JOIN teachers t ON t.id=a.teacher_id
      LEFT JOIN users u ON u.id=t.user_id
      LEFT JOIN assignment_submissions sub ON sub.assignment_id=a.id AND sub.student_id=?
      WHERE a.status='PUBLISHED'
      ORDER BY a.due_date ASC, a.created_at DESC
    `).all(s.id, s.id);
    return res.json({ assignments });
  }

  const teacher = req.user.role === "TEACHER" ? getTeacherByUserId(req.user.id) : null;
  const assignments = teacher
    ? db.prepare(`SELECT a.id,a.title,a.description,a.due_date,a.max_marks,a.status,a.created_at,c.code,c.name course_name,COUNT(s.id) submissions FROM assignments a JOIN courses c ON c.id=a.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.teacher_id=? GROUP BY a.id ORDER BY a.due_date ASC`).all(teacher.id)
    : db.prepare(`SELECT a.id,a.title,a.description,a.due_date,a.max_marks,a.status,a.created_at,c.code,c.name course_name,COUNT(s.id) submissions FROM assignments a JOIN courses c ON c.id=a.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id GROUP BY a.id ORDER BY a.due_date ASC`).all();
  res.json({ assignments });
});

router.post("/", authRequired, roleRequired("TEACHER", "ADMIN"), (req, res) => {
  const { title, description="", course_id, due_date, max_marks=10 } = req.body ?? {};
  const marks = Number(max_marks);
  if (!title?.trim() || !course_id || !due_date || !Number.isFinite(marks) || marks <= 0) return res.status(400).json({message:"Title, course, due date and positive max marks are required."});
  const teacher = req.user.role === "TEACHER" ? getTeacherByUserId(req.user.id) : null;
  if (teacher && !teacherCanManage(course_id, teacher.id)) return res.status(403).json({message:"You are not assigned to this course."});
  const course = db.prepare("SELECT id FROM courses WHERE id=?").get(Number(course_id));
  if (!course) return res.status(404).json({message:"Course not found."});
  const r = db.prepare(`INSERT INTO assignments(title,description,course_id,teacher_id,due_date,max_marks) VALUES(?,?,?,?,?,?)`).run(title.trim(),description.trim(),Number(course_id),teacher?.id ?? null,String(due_date),marks);
  logActivity(req.user.id,"CREATED","ASSIGNMENT",r.lastInsertRowid,title.trim());
  res.status(201).json({message:"Assignment published.",id:r.lastInsertRowid});
});

router.post("/:id/submit", authRequired, roleRequired("STUDENT"), (req,res) => {
  const assignment = db.prepare("SELECT * FROM assignments WHERE id=? AND status='PUBLISHED'").get(Number(req.params.id));
  if (!assignment) return res.status(404).json({message:"Assignment not found."});
  const student = getStudentByUserId(req.user.id);
  if (!db.prepare("SELECT 1 FROM enrollments WHERE student_id=? AND course_id=?").get(student.id,assignment.course_id)) return res.status(403).json({message:"You are not enrolled in this course."});
  const text = String(req.body?.submission_text ?? "").trim();
  if (!text) return res.status(400).json({message:"Submission text is required."});
  try {
    const r = db.prepare(`INSERT INTO assignment_submissions(assignment_id,student_id,submission_text) VALUES(?,?,?)`).run(assignment.id,student.id,text);
    logActivity(req.user.id,"SUBMITTED","ASSIGNMENT",r.lastInsertRowid,assignment.title);
    res.status(201).json({message:"Assignment submitted."});
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({message:"You have already submitted this assignment."});
    throw e;
  }
});

router.get("/:id/submissions", authRequired, roleRequired("TEACHER","ADMIN"), (req,res) => {
  const assignment = db.prepare("SELECT * FROM assignments WHERE id=?").get(Number(req.params.id));
  if (!assignment) return res.status(404).json({message:"Assignment not found."});
  if (req.user.role === "TEACHER") {
    const teacher = getTeacherByUserId(req.user.id);
    if (assignment.teacher_id !== teacher.id) return res.status(403).json({message:"Not your assignment."});
  }
  const submissions = db.prepare(`SELECT s.id,s.submission_text,s.score,s.feedback,s.submitted_at,s.graded_at,u.name student_name,st.roll_no FROM assignment_submissions s JOIN students st ON st.id=s.student_id JOIN users u ON u.id=st.user_id WHERE s.assignment_id=? ORDER BY s.submitted_at DESC`).all(assignment.id);
  res.json({assignment:{id:assignment.id,title:assignment.title,max_marks:assignment.max_marks},submissions});
});

router.post("/submissions/:id/grade", authRequired, roleRequired("TEACHER","ADMIN"), (req,res) => {
  const submission = db.prepare(`SELECT s.*,a.teacher_id,a.max_marks,a.title FROM assignment_submissions s JOIN assignments a ON a.id=s.assignment_id WHERE s.id=?`).get(Number(req.params.id));
  if (!submission) return res.status(404).json({message:"Submission not found."});
  if (req.user.role === "TEACHER" && submission.teacher_id !== getTeacherByUserId(req.user.id).id) return res.status(403).json({message:"Not your assignment."});
  const score = Number(req.body?.score);
  if (!Number.isFinite(score) || score < 0 || score > submission.max_marks) return res.status(400).json({message:"Score must be within the assignment marks."});
  const feedback = String(req.body?.feedback ?? "").trim();
  db.prepare(`UPDATE assignment_submissions SET score=?,feedback=?,graded_at=CURRENT_TIMESTAMP WHERE id=?`).run(score,feedback,submission.id);
  logActivity(req.user.id,"GRADED","ASSIGNMENT_SUBMISSION",submission.id,`${submission.title}: ${score}/${submission.max_marks}`);
  res.json({message:"Assignment graded."});
});

export default router;
