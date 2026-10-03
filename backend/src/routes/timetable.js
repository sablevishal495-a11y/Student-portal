import express from "express";
import { db, getStudentByUserId, getTeacherByUserId, logActivity } from "../db.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = express.Router();
const days = new Set(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]);

router.get("/", authRequired, (req,res) => {
  if (req.user.role === "STUDENT") {
    const s = getStudentByUserId(req.user.id);
    return res.json({ timetable: db.prepare(`SELECT tt.id,tt.day_of_week,tt.start_time,tt.end_time,tt.room,tt.notes,c.code,c.name course_name,u.name teacher_name FROM timetable tt JOIN courses c ON c.id=tt.course_id JOIN enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN teachers t ON t.id=tt.teacher_id LEFT JOIN users u ON u.id=t.user_id ORDER BY CASE tt.day_of_week WHEN 'MONDAY' THEN 1 WHEN 'TUESDAY' THEN 2 WHEN 'WEDNESDAY' THEN 3 WHEN 'THURSDAY' THEN 4 WHEN 'FRIDAY' THEN 5 WHEN 'SATURDAY' THEN 6 ELSE 7 END,tt.start_time`).all(s.id) });
  }
  if (req.user.role === "TEACHER") {
    const t = getTeacherByUserId(req.user.id);
    return res.json({ timetable: db.prepare(`SELECT tt.id,tt.day_of_week,tt.start_time,tt.end_time,tt.room,tt.notes,c.code,c.name course_name FROM timetable tt JOIN courses c ON c.id=tt.course_id JOIN course_teachers ct ON ct.course_id=c.id AND ct.teacher_id=? ORDER BY tt.day_of_week,tt.start_time`).all(t.id) });
  }
  res.json({ timetable: db.prepare(`SELECT tt.id,tt.day_of_week,tt.start_time,tt.end_time,tt.room,tt.notes,c.id course_id,c.code,c.name course_name,u.name teacher_name FROM timetable tt JOIN courses c ON c.id=tt.course_id LEFT JOIN teachers t ON t.id=tt.teacher_id LEFT JOIN users u ON u.id=t.user_id ORDER BY tt.day_of_week,tt.start_time`).all() });
});

router.post("/", authRequired, roleRequired("ADMIN"), (req,res) => {
  const {course_id,teacher_id=null,day_of_week,start_time,end_time,room="",notes=""}=req.body??{};
  if (!course_id || !day_of_week || !start_time || !end_time || !days.has(String(day_of_week).toUpperCase())) return res.status(400).json({message:"Course, valid day, start time and end time are required."});
  if (start_time >= end_time) return res.status(400).json({message:"End time must be after start time."});
  if (!db.prepare("SELECT 1 FROM courses WHERE id=?").get(Number(course_id))) return res.status(404).json({message:"Course not found."});
  if (teacher_id && !db.prepare("SELECT 1 FROM teachers WHERE id=?").get(Number(teacher_id))) return res.status(404).json({message:"Teacher not found."});
  const r=db.prepare(`INSERT INTO timetable(course_id,teacher_id,day_of_week,start_time,end_time,room,notes) VALUES(?,?,?,?,?,?,?)`).run(Number(course_id),teacher_id?Number(teacher_id):null,String(day_of_week).toUpperCase(),String(start_time),String(end_time),String(room).trim(),String(notes).trim());
  logActivity(req.user.id,"CREATED","TIMETABLE",r.lastInsertRowid,`${day_of_week} ${start_time}-${end_time}`);
  res.status(201).json({message:"Timetable entry created."});
});

router.delete("/:id", authRequired, roleRequired("ADMIN"), (req,res)=>{const r=db.prepare("DELETE FROM timetable WHERE id=?").run(Number(req.params.id));if(!r.changes)return res.status(404).json({message:"Timetable entry not found."});logActivity(req.user.id,"DELETED","TIMETABLE",Number(req.params.id));res.json({message:"Timetable entry deleted."})});
export default router;
