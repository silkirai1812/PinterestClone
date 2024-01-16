var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const upload = require("./multer");

const localStrategy = require("passport-local");
const passport = require('passport');
passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res, next) {
  res.render('index', {nav: false});
});

router.get('/login', function(req, res, next) {
  res.render('login', {error : req.flash('error'), nav: false});
});

router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/fileupload', isLoggedIn, upload.single("image"), async function(req, res, next) {
  const user = await userModel.findOne({username : req.session.passport.user});
  user.dp = req.file.filename;
  await user.save();
  res.redirect("/profile");
});

router.get("/add", isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render("add", {user, nav: true});
})

router.get("/feed", isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({username: req.session.passport.user});
  const posts = await postModel.find().populate("user")
  res.render("feed",{user, posts, nav: true})

})


router.get("/show/post/:cardid", async function(req, res, next) {
  try {
    const postId = req.params.cardid;
    const foundPost = await postModel.findOne({ _id: postId }).populate('user');

    if (foundPost) {
      // Render the post details page, passing the found post data to the template
      res.render('cardid', { post: foundPost, nav: true });
    } else {
      // Handle case where post is not found
      res.status(404).send('Post not found');
    }
  } catch (error) {
    // Handle any errors that may occur during the database query
    next(error);
  }
});

router.post('/upload', isLoggedIn, upload.single("postimage"), async function(req, res, next) {
  if(!req.file){
    return res.status(404).send("No files were uploaded.")
  }
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.create({
    image: req.file.filename,
    title: req.body.title,
    description:  req.body.description,
    user: user._id
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile")
});
// Save the uploaded file as a post and give the postid to user and userid to post

router.get('/profile', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  }).populate("posts");
  res.render("profile", {user, nav: true});
});

router.get('/show/posts', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  }).populate("posts");
  res.render("show", {user, nav: true});
});

router.post("/register", function(req, res){
  const userData = new userModel({
    username: req.body.username,
    email: req.body.email, 
    fullName: req.body.fullname
  });
  userModel.register(userData, req.body.password)
  .then (function(){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile");
    })
  })
});
router.post("/login", passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login",
  failureFlash: true
}), function(req, res){
});
router.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  })
})

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login");
}

module.exports = router;
