const express = require("express");
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const flash = require("express-flash");
const session = require("express-session");
const cookie = require("cookie-parser");
const router = require("./modules/router");

const app = express();

// Static folder routes
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
  })
);
app.set("views", path.join(__dirname + `/views`));
app.use(cookie(process.env.COOKIE_SECRET));
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use("/css", express.static(path.join(__dirname + "/front/css"))); // Static routes
app.use("/fonts", express.static(path.join(__dirname + "/front/fonts"))); // Static routes
app.use("/images", express.static(path.join(__dirname + "/front/images"))); // Static routes
app.use("/js", express.static(path.join(__dirname + "/front/js"))); // Static routes
app.use("/id", express.static(path.join(__dirname + "/front/ID"))); // Static routes
app.use(flash());
app.use(router);
mongoose.connect(process.env.DB).then(() => {
  app.listen(process.env.PORT, console.log("Server running"));
});
