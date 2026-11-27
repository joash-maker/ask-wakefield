import { suggestedQuestions } from '../lib/chat-followups.js';
export default function handler(req,res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({followups:[]});
  const {question,answer}=req.body || {};
  if(typeof question!=='string' || typeof answer!=='string' || !question.trim() || !answer.trim() || question.length>3000 || answer.length>14000)return res.status(400).json({followups:[]});
  return res.status(200).json({followups:suggestedQuestions(question,answer)});
}
