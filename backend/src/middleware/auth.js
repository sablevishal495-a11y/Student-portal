import jwt from "jsonwebtoken";import {db} from "../db.js";
const JWT_SECRET=process.env.JWT_SECRET||"dev-only-secret-change-me";
export function authRequired(req,res,next){const h=req.headers.authorization||"",token=h.startsWith("Bearer ")?h.slice(7):null;if(!token)return res.status(401).json({message:"Authentication required."});try{const p=jwt.verify(token,JWT_SECRET);const u=db.prepare(`SELECT id,name,email,role,phone,is_active,created_at FROM users WHERE id=?`).get(p.id);if(!u||!u.is_active)return res.status(401).json({message:"Account is inactive or missing."});req.user=u;next()}catch{return res.status(401).json({message:"Invalid or expired token."})}}
export function roleRequired(...roles){return(req,res,next)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({message:"You do not have permission for this action."});next()}}
export function signToken(user){return jwt.sign({id:user.id,role:user.role},JWT_SECRET,{expiresIn:"12h"})}
