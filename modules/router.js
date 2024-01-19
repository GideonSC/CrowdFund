const express = require("express");
const jwt = require("jsonwebtoken");
const Schema = require("./schema");
const sendEmail = require("./sendMail");
const bcrypt = require("bcryptjs");
const Axios = require("request-promise");
const random = require("./randomNum");
const app = express();

var cookieopts = {
  maxAge: 60 * 300 * 1000, // 15hrs
  httpOnly: true,
  sameSite: "lax",
};

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
              req.flash("message", "Error sending to email.");
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

app.post("/signin", signin);

async function signin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw "Fields cannot be blank";
    } else {
      Schema.User.findOne({ email })
        .then(async (data) => {
          const $password = await bcrypt.compare(password, data.password);
          if ($password) {
            const token = jwt.sign({ id: data._id }, process.env.JWT_SECRET, {
              expiresIn: "5hrs",
            });
            res.cookie("user", token, cookieopts);
            res.redirect("/dashboard");
          } else throw $password;
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Error signing you in.");
          res.redirect("/id");
        });
    }
  } catch (err) {
    console.log(err);
    req.flash("message", "Error signing you in.");
    res.redirect("/id");
  }
} // sign in function

function Block(req, res, next) {
  // Blocks from accessing if not signed in
  try {
    const { user } = req.cookies;
    if (user) {
      jwt.verify(user, process.env.JWT_SECRET, (err, decoded) => {
        try {
          if (err) {
            throw err;
          } else {
            // console.log(decoded);
            Schema.User.findById(decoded.id)
              .then((d) => {
                if (d) {
                  req.user = decoded.id;
                  next();
                } else throw "Not Found";
              })
              .catch((err) => {
                req.flash("message", "Please Sign in");
                res.redirect("/id");
              });
          }
        } catch (error) {
          req.flash("message", "Please Sign in");
          res.redirect("/id");
        }
      });
    } else {
      console.log(res.cookie);
      throw "No cookie present";
    }
  } catch (error) {
    console.log(error);
    req.flash("message", "Please Sign in");
    res.redirect("/id");
  }
}

function SignBlock(req, res, next) {
  // Allows if in ID
  try {
    const { user } = req.cookies;
    if (user) {
      jwt.verify(user, process.env.JWT_SECRET, (err, decoded) => {
        try {
          if (err) {
            throw err;
          } else {
            // console.log(decoded);
            Schema.User.findById(decoded.id)
              .then((d) => {
                if (d) {
                  req.user = decoded.id;
                  res.redirect("/dashboard");
                } else throw "Not Found";
              })
              .catch((err) => {
                next();
              });
          }
        } catch (error) {
          next();
          // req.flash("message", "Please Sign in");
          // res.redirect("/id");
        }
      });
    } else {
      console.log(res.cookie);
      throw "No cookie present";
    }
  } catch (error) {
    console.log(error);
    req.flash("message", "Please Sign in");
    res.redirect("/id");
  }
}

app.get("/verify/:token", (req, res) => {
  try {
    const { token } = req.params;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        try {
          if (err) {
            throw err;
          } else {
            // Already decoded
            const { fullname, password, username, number, email } = decoded;
            const $user_check = await Schema.User.findOne({ email });
            if ($user_check) {
              req.flash("message", "Token Expired");
              res.redirect("/id"); //User found verification code expired
            } else {
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
              const tx_ref = random(10);

              const body = JSON.stringify({
                tx_ref,
                amount: price,
                currency: "NGN",
                payment_options: "card, ussd, banktransfer",
                customer: {
                  email,
                  name: fullname,
                },
                redirect_url: `http://localhost:5000/pay-ver/${Buffer.from(
                  tx_ref
                ).toString("base64")}`, // Change this to actual route
              });

              User.save()
                .then(async (data) => {
                  // Move to payment
                  const TXN = new Schema.TXN({
                    amount: 1000,
                    ref: tx_ref,
                    owner: data._id,
                    status: "pending",
                  });
                  await TXN.save();
                  Axios("https://api.flutterwave.com/v3/payments", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                      Authorization: `Bearer ${process.env.SECRET_FLW}`,
                    },
                    body: body,
                  })
                    .then(($) => {
                      const resp = JSON.parse($);
                      res.redirect(resp.data.link); // Redirect to flutterwave place
                    })
                    .catch((err) => {
                      console.log(err);
                      req.flash("message", "Error Signing you up");
                      res.redirect("/id");
                    });
                })
                .catch((e) => {
                  console.log(e);
                  req.flash("message", "Error Signing you up");
                  res.redirect("/id");
                });
            }
          }
        } catch (error) {
          req.flash("message", "Token mismatch");
          res.redirect("/id");
        }
      });
    } else {
      throw "No token found";
    }
  } catch (err) {
    console.log(err);
    req.flash("message", "Token mismatch");
    res.redirect("/id");
  }
});

app.get("/pay-ver/:ref", async (req, res) => {
  try {
    const $ = req.params.ref;

    const ref = Buffer.from($, "base64").toString("utf-8");
    const { status } = req.query;
    if (status == "cancelled") {
      await Schema.TXN.findOneAndUpdate(
        { ref },
        {
          status,
        }
      );
      req.flash("message", "Failed Transaction");
      res.redirect("/id");
    } else if (status == "successful") {
      Schema.TXN.findOne({ ref }).then(($data) => {
        if ($data && $data.status != "paid") {
          // Check if transaction reference is not already paid
          Schema.User.findById($data.owner)
            .then((data) => {
              if (data) {
                // If user found update transaction to found and edit level.
                Schema.User.findByIdAndUpdate(data._id, {
                  wallet: data.wallet + $data.amount, // adding to the inital wallet amount
                  level: 1, // set to level 1
                })
                  .then(async () => {
                    await Schema.TXN.findByIdAndUpdate($data._id, {
                      status: "paid",
                    });
                    const token = jwt.sign(
                      { id: data._id },
                      process.env.JWT_SECRET,
                      {
                        expiresIn: "5hrs",
                      }
                    );
                    res.cookie("user", token, cookieopts);
                    // Payment verification
                  })
                  .catch((err) => {
                    console.log(err);
                    req.flash("message", "Failed Transaction");
                    res.redirect("/id");
                  });
              } else throw 0;
            })
            .catch((err) => {
              console.log(err);
              req.flash("message", "Invalid Transaction detected.");
              res.status(404).redirect("/id");
            });
        } else throw 0;
      });
    } else {
      throw "invalid txn status";
    }
  } catch (error) {
    req.flash("message", "Error Validating Transaction.");
    res.redirect("/id");
  }
});

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/about", (req, res) => {
  res.render("about");
});
app.get("/dashboard", Block, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  res.render("dashboard", { user });
});
app.get("/testimonial", (req, res) => {
  res.render("testimonial");
});

app.get("/profile", Block, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  res.render("profile", { user });
});
app.get("/id", SignBlock, (req, res) => {
  res.render("id", { flash: req.flash("message") });
});
app.get("/contact", (req, res) => {
  res.render("contact");
});

app.delete("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/");
});

app.use((req, res) => {
  // 404 page
  res.send("Page not found");
});
module.exports = app;
