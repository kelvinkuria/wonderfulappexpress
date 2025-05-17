require("dotenv").config()
const jwt  =require('jsonwebtoken')
const bcrypt=require('bcrypt');
const express = require('express');
const db = require("better-sqlite3") ("ourApp.db")

const createTables = db.transaction(() => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL 
    )`
  ).run();
});
createTables();





db.pragma("journal_mode = WAL")
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false}))
app.use(express.static('public'));
app.use(function(req, res, next) {
res.locals.errors =[]
next();
})



app.get("/",(req,res)=>{
     res.render('homepage')
})
app.get('/login',(req,res)=>{
    res.render('login')
})

app.post("/register", (req, res) => {
  const errors = [];

  if (typeof req.body.username !== 'string') req.body.username = '';
  if (typeof req.body.password !== 'string') req.body.password = '';
  req.body.username = req.body.username.trim();

  if (!req.body.username) errors.push('Username is required');
  if (req.body.username.length < 3) errors.push('Username must be at least 3 characters long');
  if (req.body.username.length > 10) errors.push('Username cannot exceed 10 characters');
  if (!req.body.username.match(/^[a-zA-Z0-9]+$/)) errors.push('Username can only contain letters and numbers');
  if (!req.body.password) errors.push('Password is required');
  if (req.body.password.length < 8) errors.push('Password must be at least 8 characters long');
  if (req.body.password.length > 12) errors.push('Password cannot exceed 12 characters');

  // ✅ Check for existing user
  const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(req.body.username);
  if (existingUser) errors.push("Username already taken");

  if (errors.length) {
    return res.render("homepage", { errors });
  }

  // Proceed to register user
  const salt = bcrypt.genSaltSync(10);
  req.body.password = bcrypt.hashSync(req.body.password, salt);

  const ourStatement = db.prepare("INSERT INTO USERS (USERNAME, PASSWORD) VALUES (?, ?)");
  const result = ourStatement.run(req.body.username, req.body.password);

  const lookUpStatement = db.prepare("SELECT * FROM USERS WHERE ROWID = ?");
  const ourUser = lookUpStatement.get(result.lastInsertRowid);

  const ourTokenValue = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    skyColor: "blue",
    userid: ourUser.id,
    username: ourUser.username
  }, process.env.JWTSECRET);

  res.cookie('ourSimpleApp', ourTokenValue, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });

  res.send("Thank you for registering");
});

app.listen(3000)


