// require("dotenv").config()
// const jwt  =require('jsonwebtoken')
// const bcrypt=require('bcrypt');
// const express = require('express');
// const db = require("better-sqlite3") ("ourApp.db")

// const createTables = db.transaction(() => {
//   db.prepare(`
//     CREATE TABLE IF NOT EXISTS users (
//      id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT NOT NULL UNIQUE,
//       password TEXT NOT NULL 
//     )`
//   ).run();
// });
// createTables();





// db.pragma("journal_mode = WAL")
// const app = express();
// app.set("view engine", "ejs");
// app.use(express.urlencoded({ extended: false}))
// app.use(express.static('public'));
// app.use(function(req, res, next) {
// res.locals.errors =[]
// next();
// })



// app.get("/",(req,res)=>{
//      res.render('homepage')
// })
// app.get('/login',(req,res)=>{
//     res.render('login')
// })

// app.post("/register", (req, res) => {
//   const errors = [];

//   if (typeof req.body.username !== 'string') req.body.username = '';
//   if (typeof req.body.password !== 'string') req.body.password = '';
//   req.body.username = req.body.username.trim();

//   if (!req.body.username) errors.push('Username is required');
//   if (req.body.username.length < 3) errors.push('Username must be at least 3 characters long');
//   if (req.body.username.length > 10) errors.push('Username cannot exceed 10 characters');
//   if (!req.body.username.match(/^[a-zA-Z0-9]+$/)) errors.push('Username can only contain letters and numbers');
//   if (!req.body.password) errors.push('Password is required');
//   if (req.body.password.length < 8) errors.push('Password must be at least 8 characters long');
//   if (req.body.password.length > 12) errors.push('Password cannot exceed 12 characters');

//   // ✅ Check for existing user
//   const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(req.body.username);
//   if (existingUser) errors.push("Username already taken");

//   if (errors.length) {
//     return res.render("homepage", { errors });
//   }

//   // Proceed to register user
//   const salt = bcrypt.genSaltSync(10);
//   req.body.password = bcrypt.hashSync(req.body.password, salt);

//   const ourStatement = db.prepare("INSERT INTO USERS (USERNAME, PASSWORD) VALUES (?, ?)");
//   const result = ourStatement.run(req.body.username, req.body.password);

//   const lookUpStatement = db.prepare("SELECT * FROM USERS WHERE ROWID = ?");
//   const ourUser = lookUpStatement.get(result.lastInsertRowid);

//   const ourTokenValue = jwt.sign({
//     exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
//     skyColor: "blue",
//     userid: ourUser.id,
//     username: ourUser.username
//   }, process.env.JWTSECRET);

//   res.cookie('ourSimpleApp', ourTokenValue, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "strict",
//     maxAge: 1000 * 60 * 60 * 24 * 7
//   });

//   res.send("Thank you for registering");
// });

// app.listen(3000)






require('dotenv').config()//secret configuration file to store secret information such as secret keys
const jwt = require('jsonwebtoken')//jSON WEB TOKENS (digital ids) used to identify users who have logged in

const marked = require("marked")
const bcrypt = require('bcrypt')//hashes passwords to a one way process of turning passwords to a jumbled string of characters.
const cookieParser = require('cookie-parser')
const express = require('express');//imports the express library;
const db = require("better-sqlite3")("ourApp.db");//sets up connection to a db called ourApp.db.dbs are organized storage systems for the organisations data eg user accounts.
const sanitizeHTML = require('sanitize-html')


//db.transaction means entire operations are treated as a single unit.any part fails,the whole thing is rolled back.
const createTables = db.transaction(()=>{
    db.prepare(
        `CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        PASSWORD TEXT NOT NULL)`
    ).run();
    db.prepare(`
CREATE TABLE IF NOT EXISTS posts(
id INTEGER PRIMARY KEY AUTOINCREMENT,
createdDate TEXT,
title STRING NOT NULL,
body TEXT NOT NULL,
authorid INTEGER,
FOREIGN KEY (authorid) REFERENCES users (id)
)


        `).run()
})
createTables();

db.pragma("journal_mode = WAL");//write ahead logging mode improves perfomance and reliability of the db

const app=express();//creates an instance of an express application
app.set("view engine",'ejs')//view engine helps in dynammically generate html content that will be sent to the users browsers
app.use(express.urlencoded({extended:false}))//middleware -functions that run during processing of incoming http requests.
app.use(express.static('public'))
app.use (cookieParser())


app.use(function(req,res,next){
res.locals.filterUserHTML = function(content){
    return sanitizeHTML(marked.parse(content),{
        allowedTags:["p","br","ul","li","ol","strong","bold","i","em","h1","h2","h3","h4","h5","h6"],
        allowedAttributes:{}
    })
}


    res.locals.errors = []

try {
    const decoded = jwt.verify(req.cookies.ourSimpleApp , process.env.JWTSECRET)
    req.user = decoded 
} catch (error) {
    req.user = false
    
}
res.locals.user = req.user
console.log(req.user)
    next()
})







app.get("/", (req, res) => {
    if (req.user) {
        const postsStatement = db.prepare("SELECT * FROM posts WHERE authorid = ? ORDER BY createdDate DESC")
        const posts = postsStatement.all(req.user.userid)
        return res.render("dashboard",{ posts, user: req.user });
    }
    res.render('homepage');
});

app.get('/login',(req,res)=>{
    res.render('login')
})

app.get('/logout',(req,res)=>{
    res.clearCookie("ourSimpleApp")
    res.redirect('/')
})

app.post('/login', (req,res)=>{
    let errors=[];
    if(typeof req.body.username !=='string') req.body.username='';
    if(typeof req.body.password!=="string") req.body.username='';
   if(req.body.username.trim()=="")errors=['Invalid username/password']
   if(req.body.password=="")errors=['Invalid username/password']
    if(errors.length){
        return res.render('login',{errors})
    }
    const userInQuestionStatement = db.prepare ("SELECT * FROM users WHERE USERNAME =? ")
    const userInQuestion= userInQuestionStatement.get(req.body.username)
    if(!userInQuestion){
 errors = ["invalid username/password"]
 return res.render("login",{errors})
    }
    const matchOrNot = bcrypt.compareSync(req.body.password,userInQuestion.password)
    if(!matchOrNot){
       errors = ["invalid username/password"]
 return res.render("login",{errors}) 
    }

const ourTokenValue = jwt.sign({
    exp: Math.floor(Date.now()/1000)+60*60*24,
    skyColor:"blue",
    userid:userInQuestion.id,
    username:userInQuestion.username
},process.env.JWTSECRET)
res.cookie('ourSimpleApp',ourTokenValue,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge:1000*60*60*24*7
})
res.redirect('/')

})
 
function mustBeLoggedIn(req,res,next){
    if(req.user){
        return next()
    }
    return res.redirect("/")
}

app.get("/edit-post/:id",mustBeLoggedIn,(req,res)=>{
const statement = db.prepare("SELECT * FROM posts WHERE id =?")
const post = statement.get(req.params.id)

if(!post){
    return res.redirect("/")
}



if(post.authorid !== req.user.userid){
    return res.redirect('/')
}



res.render("edit-post",{post})


})



app.post("/edit-post/:id", mustBeLoggedIn,(req, res) => {
  const statement = db.prepare("SELECT * FROM posts WHERE id =?");
  const post = statement.get(req.params.id);

  if (!post) {
    return res.redirect("/");
  }

  if (post.authorid !== req.user.userid) {
    return res.redirect("/");
  }

  const errors = sharedPostValidation(req);
  if (errors.length) {
    return res.render("edit-post", { post: { ...post, ...req.body } });
    // Merges original post with user's edited values
  }

  const updateStatement = db.prepare("UPDATE posts SET title= ?, body = ? WHERE id =?");
  updateStatement.run(req.body.title, req.body.body, req.params.id);

  res.redirect(`/post/${req.params.id}`);
});

app.post("/delete-post/:id",mustBeLoggedIn,(req,res)=>{

    const statement = db.prepare("SELECT * FROM posts WHERE id =?")
    const post = statement.get(req.params.id)

    if(!post){
        return res.redirect("/")
    }
    const deleteStatement = db.prepare("DELETE FROM posts WHERE id = ?")
    deleteStatement.run(req.params.id)
    res.redirect('/')
})



app.get("/post/:id", (req,res)=>{
    const statement =db.prepare("SELECT posts.*,users.username FROM posts INNER JOIN users ON posts.authorid = users.id  WHERE posts.id = ?")
    const post =statement.get(req.params.id)
    if(!post){
        return res.redirect("/")
    }
    
    // Fix: Check if user is logged in first, then compare with userid instead of id
    const isAuthor = req.user && post.authorid === req.user.userid
    
    res.render("single-post",{ post, isAuthor})
})




app.get("/create-post", mustBeLoggedIn,(req,res)=>{
    res.render("create-post")

})
function sharedPostValidation(req){
const errors = []
if(typeof req.body.title !=='string') req.body.title=""
if(typeof req.body.body !=='string') req.body.body=""

req.body.title= sanitizeHTML(req.body.title.trim(),{allowedTags:[], allowedAttributes: {}})
req.body.body= sanitizeHTML(req.body.body.trim(),{allowedTags:[], allowedAttributes: {}})

if(!req.body.title) errors.push('You must provide a title')
if(!req.body.body) errors.push('You must provide a content')

return errors
}
app.post("/create-post",mustBeLoggedIn,(req,res)=>{
const errors = sharedPostValidation(req)
if(errors.length){
    return res.render("create-post",{errors})
}

const ourStatement=db.prepare("INSERT INTO posts (title,body,authorid,createdDate) VALUES(?,?,?,?)")
const result = ourStatement.run(req.body.title,req.body.body,req.user.userid,new Date().toISOString())

const getPostStatement = db.prepare("SELECT * FROM posts WHERE ROWID=?")
const realPost =getPostStatement.get(result.lastInsertRowid)
res.redirect(`/post/${realPost.id}`)

})


app.post("/register",(req,res)=>{
    const errors=[];
    if(typeof req.body.username !=='string') req.body.username='';
    if(typeof req.body.password!=="string") req.body.username='';
    req.body.username=req.body.username.trim();


    if(!req.body.username)errors.push('username is required')
        if(req.body.username.length<3)errors.push("Username must be atlest 3 characters")
            if(req.body.username.length>10) errors.push("username cannot exceed 10 characters")



                if(!req.body.username.match(/^[a-zA-Z0-9]+$/))errors.push('username can only vontain numbers and letters')



                    if(!req.body.password)errors.push('password required')
                        if(req.body.password.length<8)errors.push('password must be atleast 8 characters')
                            if(req.body.password.length>12)errors.push("password cannot exceed 12 characters")

    const existingUser = db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username)
    if(existingUser) errors.push("username is already taken")
        if(errors.length){
            return res.render("homepage",{errors})
        }
        const salt = bcrypt.genSaltSync(10)
        req.body.password = bcrypt.hashSync(req.body.password,salt);

        const ourStatement = db.prepare("INSERT INTO USERS (USERNAME,PASSWORD) VALUES(?,?)");
       const result= ourStatement.run(req.body.username,req.body.password)
       const lookUpStatement = db.prepare("SELECT * FROM USERS WHERE ROWID = ?")
       const ourUser = lookUpStatement.get(result.lastInsertRowid);

const ourTokenValue = jwt.sign({
    exp: Math.floor(Date.now()/1000)+60*60*24,
    skyColor:"blue",
    userid:ourUser.id,
    username:ourUser.username
},process.env.JWTSECRET)
res.cookie('ourSimpleApp',ourTokenValue,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge:1000*60*60*24*7
})


res.redirect("/")


})
app.listen(3000)