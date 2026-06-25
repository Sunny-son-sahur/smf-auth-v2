const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const DB = path.join("/tmp", "keys.json");

function load() { try { return JSON.parse(fs.readFileSync(DB,"utf8")); } catch(e) { return {keys:{}}; } }
function save(d) { fs.writeFileSync(DB, JSON.stringify(d,null,2)); }
function genKey() { const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let k=""; for(let i=0;i<20;i++) { if(i>0&&i%5===0) k+="-"; k+=c[crypto.randomInt(c.length)]; } return k; }
function readBody(r) { return new Promise(ok => { let b=""; r.on("data",c=>b+=c); r.on("end",()=>{ try{ok(JSON.parse(b))}catch(e){ok({)} }); }); }

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"POST only"});
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({error:"ADMIN_SECRET env not set"});
  const {secret:s, count} = await readBody(req);
  if (s!==secret) return res.status(403).json({error:"Wrong secret"});
  const db=load(); const keys=[];
  for (let i=0;i<Math.min(count||1,100);i++) { let k; do{k=genKey()}while(db.keys[k]); db.keys[k]={hwid:null,created:new Date().toISOString()}; keys.push(k); }
  save(db); res.json({success:true,keys});
};