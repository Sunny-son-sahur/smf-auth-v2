const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());

const DB_FILE = path.join("/tmp", "keys.json");

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        }
    } catch(e) {}
    return { keys: {} };
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function genKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const parts = [];
    for (let p = 0; p < 4; p++) {
        let s = "";
        for (let i = 0; i < 5; i++) s += chars[crypto.randomInt(chars.length)];
        parts.push(s);
    }
    return parts.join("-");
}

app.post("/api/validate", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const { key, hwid } = req.body;
    if (!key || !hwid) return res.status(400).json({ valid: false, message: "Missing key or hwid" });

    const db = loadDB();
    const k = key.toUpperCase().trim();
    if (!db.keys[k]) return res.status(401).json({ valid: false, message: "Invalid license key" });

    const entry = db.keys[k];

    if (!entry.hwid) {
        entry.hwid = hwid;
        entry.firstUse = new Date().toISOString();
        saveDB(db);
        return res.json({ valid: true, message: "Key activated and bound to your hardware." });
    }

    if (entry.hwid === hwid) {
        return res.json({ valid: true, message: "Key valid" });
    }

    return res.status(403).json({ valid: false, message: "Key is bound to different hardware. Contact support." });
});

app.post("/api/generate", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET) return res.status(500).json({ error: "ADMIN_SECRET not configured" });

    const { secret, count } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(
