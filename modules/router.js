const express = require("express");
const jwt = require("jsonwebtoken");
const Schema = require("./schema");
const sendEmail = require("./sendMail");
const bcrypt = require("bcryptjs");
const Axios = require("request-promise");
const random = require("./randomNum");
const Controller = require("./controller");
const app = express();

var cookieopts = {
  maxAge: 60 * 300 * 1000, // 15hrs
  httpOnly: true,
  sameSite: "lax",
};

app.set("view engine", "ejs");

app.post("/signup", (req, res) => {
  const { fullname, username, email, number, password, ref } = req.body;
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
              ref,
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
            link: `https://www.crowdfunds.com.ng/verify/${token}`,
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
          } else {
            req.flash("message", "Incorrect Email or Password");
            res.redirect("/id");
          }
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
        }
      });
    } else {
      console.log(res.cookie);
      throw "No cookie present";
    }
  } catch (error) {
    next();
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
            const { fullname, password, username, number, email, ref } =
              decoded;
            const $user_check = await Schema.User.findOne({ email });
            if ($user_check) {
              req.flash("message", "Token Expired");
              res.redirect("/id"); //User found verification code expired
            } else {
              const User = new Schema.User({
                fullname,
                password,
                username,
                referer: ref,
                phoneNumber: number,
                email,
                level: { level: 0, date: new Date(), updated: false },
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
                // redirect_url: `http://localhost:5000/pay-ver/${Buffer.from(
                redirect_url: `https://crowdfunds.com.ng/pay-ver/${Buffer.from(
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
      // for tests
      await Schema.TXN.findOneAndUpdate(
        { ref },
        {
          status,
        }
      );
      req.flash("message", "Failed Transaction");
      res.redirect("/id");
    } else if (status == "successful") {
      Schema.TXN.findOne({ ref })
        .then(($data) => {
          if ($data && $data.status != "paid") {
            // Check if transaction reference is not already paid
            Schema.User.findById($data.owner) // New user being created
              .then((data) => {
                if (data) {
                  // If user found, update transaction to found and edit level.
                  Schema.User.findById(data.referer)
                    .then((referer_data) => {
                      if (referer_data) {
                        Schema.User.findByIdAndUpdate(data.referer, {
                          wallet: referer_data.wallet + 500,
                          referee: [...referer_data.referee, data._id],
                        })
                          .then((x) => {})
                          .catch((err) => {
                            console.log(err);
                          });
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                      req.flash("message", "Failed Transaction");
                      res.redirect("/id");
                    }); // Crediting referer
                  Schema.User.findByIdAndUpdate(data._id, {
                    wallet: data.wallet + $data.amount, // adding to the inital wallet amount
                    level: { level: 1, date: new Date(), updated: false }, // set to level 1
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
                      res.redirect("/dashboard");
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
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Error Validating Transaction.");
          res.redirect("/id");
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
app.get("/dashboard", Block, Controller.levelAuth, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  res.render("dashboard", { user, withdraw: req.withdraw });
});
app.get("/testimonial", (req, res) => {
  res.render("testimonial");
});

app.get("/profile", Block, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  res.render("profile", { user });
});
app.get("/id", SignBlock, async (req, res) => {
  const { ref } = req.query;
  try {
    if (ref) {
      const referrer = await Schema.User.findById(ref);
      if (referrer) res.render("id", { flash: req.flash("message"), ref });
      else throw 0;
    } else {
      res.render("id", { flash: req.flash("message"), ref: "" });
    }
  } catch (error) {
    req.flash("message", "Referral Code Error");
    res.redirect(`/id`);
  }
});
app.get("/contact", (req, res) => {
  res.render("contact");
});

app.delete("/logout", (req, res) => {
  res.clearCookie("user");
  res.end("");
});

app.put("/withdraw", (req, res) => {
  // Withdrawal algorithm
});

app.use((req, res) => {
  // 404 page
  res.send("Page requested not found <br> <a href='/'>Go home</a>");
});
module.exports = app;
