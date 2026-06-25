const fs = require("fs");
const path = require("path");
const DB = path.join("/tmp", "keys.json");

function load() { try { return JSON.parse(fs.readFileSync(DB,"utf8")); } catch(e) { return {keys:{}}; } }
function save(d) { fs.writeFileSync(DB, JSON.stringify(d,null,2)); }
function readBody(r) { return new Promise(ok => { let b=""; r.on("data",c=>b+=c); r.on("end",()=>{ try{ok(JSON.parse(b))}catch(e){ok({)} }); }); }

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"POST only"});
  const {key,hwid} = await readBody(req);
  if (!key||!hwid) return res.status(400).json({valid:false,message:"Missing key or hwid"});
  const db=load(); const k=key.toUpperCase().trim();
  if (!db.keys[k]) return res.status(401).json({valid:false,message:"Invalid license key"});
  const e=db.keys[k];
  if (!e.hwid) { e.hwid=hwid; e.firstUse=new Date().toISOString(); save(db); return res.json({valid:true,message:"Key activated and bound."}); }
  if (e.hwid===hwid) return res.json({valid:true,message:"Key valid"});
  return res.status(403).json({valid:false,message:"Key bound to different hardware."});
};
