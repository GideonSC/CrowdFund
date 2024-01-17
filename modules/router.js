const express = require("express");
const jwt = require("jsonwebtoken");
const Schema = require("./schema");
const sendEmail = require("./sendMail");
const bcrypt = require("bcryptjs");
const Axios = require("axios");
const randGen = require("./randomNum");
const app = express();

app.set("view engine", "ejs");

app.post("/signup", (req, res) => {
  const { fullname, username, email, number, password } = req.body;
  if (
    !fullname.toString().trim() ||
    !email.toString().trim() ||
    !username.toString().trim() ||
    !number.toString().trim() ||
    !password.toString().trim()
  ) {
    // if any is null
    req.flash("message", "Fill in all fields to proceed");
    res.redirect("/id");
  } else {
    // Do work
    Schema.User.findOne({ email })
      .then(async (data) => {
        if (!data) {
          // No user match so can save
          const token = jwt.sign(
            {
              fullname,
              username,
              email,
              number,
              password: bcrypt.hashSync(password, 10),
            },
            process.env.JWT_SECRET,
            { expiresIn: "30min" }
          );
          // Send to user via nodemailer
          sendEmail({
            title: "Crowd Fund Email Verification",
            email: email,
            message: `Welcome to CrowdFund 
            ${username}, <br/> please verify your email 
            by clicking the link below, this process 
            is automatic.`,
            subject: "Email Verification",
            link: `http://localhost:5000/verify/${token}`,
          })
            .then(() => {
              console.log(`Sent email to ${email}`);
              res.render("email_sent");
            })
            .catch((err) => {
              console.log(err);
              req.flash("message", "Error sending to email");
              res.redirect("/id");
            });
        } else {
          // User match found do not save
          throw "User match found";
        }
      })
      .catch((err) => {
        console.log(err);
        req.flash("message", "User with that email already exist");
        res.redirect("/id");
      });
    // Check if user exsits
  }
});

app.get("/verify/:token", (req, res) => {
  try {
    const { token } = req.params;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          throw err;
        } else {
          // Already decoded
          const { fullname, password, username, number, email } = decoded;

          const User = new Schema.User({
            fullname,
            password,
            username,
            phoneNumber: number,
            email,
            level: 0,
            wallet: 0,
          });
          const price = 4000;
          const body = JSON.stringify({
            tx_ref: new Buffer(randGen(6), "base64"),
            amount: price,
            currency: "NGN",
            customer: {
              email,
            },
            redirect_url: "http://localhost:5000/", // Change this to actual route
          });
          User.save()
            .then(() => {
              // Move to payment
              Axios("https://api.flutterwave.com/v3/payments", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  Authorization: `Bearer ${process.env.FLW_SECRECT_KEY}`,
                },
                body: body,
              });
            })
            .catch((e) => {
              req.flash("message", "Error Signing you up");
              res.redirect("/id");
            });
        }
      });
    } else {
      throw "No token found";
    }
  } catch (err) {
    req.flash("message", "Token mismatch");
    res.redirect("/id");
  }
});

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/about", (req, res) => {
  res.render("about");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});
app.get("/testimonial", (req, res) => {
  res.render("testimonial");
});
app.get("/profile", (req, res) => {
  res.render("profile");
});
app.get("/id", (req, res) => {
  res.render("id", { flash: req.flash("message") });
});
app.get("/contact", (req, res) => {
  res.render("contact");
});
app.use((req, res) => {
  // 404 page
  res.send("Page not found");
});
module.exports = app;
