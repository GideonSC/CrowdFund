const express = require("express");
const jwt = require("jsonwebtoken");
const Schema = require("./schema");
const sendEmail = require("./sendMail");
const bcrypt = require("bcryptjs");
const Axios = require("request-promise");
const random = require("./randomNum");
const Controller = require("./controller");
const { sendMail } = require("./transporter");
const pay = require("./pay");
const randomGen = require("./randomNum");
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
    Schema.User.findOne({
      email,
    })
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
            {
              expiresIn: "30min",
            }
          );
          // Send to user via nodemailer
          sendEmail({
            title: `${username} Verify your email. `,
            email: email,
            message: `Welcome to CrowdFund
            ${username}, <br/> please verify your email
            by clicking the link below, this process
            is automatic.`,
            subject: `Hello ${username} this is your Email Verification`,
            link: `https://www.crowdfunds.com.ng/verify/${token}`,
            // link: `http://localhost:5000/verify/${token}`,
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

app.post("/signin", signin, Controller.payAuth);

async function signin(req, res, done) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw "Fields cannot be blank";
    } else {
      Schema.User.findOne({
        email,
      })
        .then(async (data) => {
          const $password = await bcrypt.compare(password, data.password);
          if ($password) {
            req.user = data._id;
            done();
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
    if (token !== "" || token !== undefined) {
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        try {
          if (err) {
            console.log("here");
          } else {
            const { fullname, password, username, number, email, ref } =
              decoded;
            Schema.User.findOne({
              email,
            })
              .then((data) => {
                if (data)
                  // User found
                  throw "User found";
                else {
                  // User not found
                  const User = new Schema.User({
                    fullname,
                    password,
                    username,
                    referer: ref,
                    phoneNumber: number,
                    email,
                    level: {
                      level: 0,
                      date: new Date(),
                      updated: false,
                    },
                    wallet: 0,
                  });
                  const price = 4 * 100000;
                  const tx_ref = random(10);
                  const buff = Buffer.from(tx_ref).toString("base64");

                  const body = JSON.stringify({
                    reference: tx_ref,
                    amount: price,
                    currency: "NGN",
                    email: email,
                    channels: ["card", "mobile_money", "bank_transfer"],
                    callback_url: `https://crowdfunds.com.ng/pay-ver/${buff}`, // Change this to actual route
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
                      Axios("https://api.paystack.co/transaction/initialize", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          Authorization: `Bearer ${process.env.PAYSTACK_PUB}`,
                        },
                        body: body,
                      })
                        .then(($) => {
                          const resp = JSON.parse($);
                          res.redirect(resp.data.authorization_url); // Redirect to flutterwave place
                        })
                        .catch((err) => {
                          console.log("here");
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
              })
              .catch((err) => {
                req.flash("message", "Error validating");
                res.redirect("/id");
              });
          }
          // } else {
          //   // Already decoded

          //   if ($user_check) {
          //     req.flash("message", "Token Expired");
          //     res.redirect("/id"); //User found verification code expired
          //   } else {

          //     // const body = JSON.stringify({
          //     //   tx_ref,
          //     //   amount: price,
          //     //   currency: "NGN",
          //     //   payment_options: "card, ussd, banktransfer",
          //     //   customer: {
          //     //     email,
          //     //     name: fullname,
          //     //   },
          //     //   // redirect_url: `http://localhost:5000/pay-ver/${Buffer.from(
          //     //   redirect_url: `https://crowdfunds.com.ng/pay-ver/${buff}`, // Change this to actual route
          //     // });

          //   }
          // }
        } catch (error) {
          console.log(error);
          console.log("1");
          req.flash("message", "Token mismatch");
          res.redirect("/id");
        }
      });
    } else {
      throw "No token found";
    }
  } catch (err) {
    console.log("2");
    console.log(err);
    req.flash("message", "Token mismatch");
    res.redirect("/id");
  }
});

app.get("/pay-ver/:ref", async (req, res) => {
  try {
    const $ = req.params.ref;
    const ref = Buffer.from($, "base64").toString("utf-8");
    const { trxref } = req.query;

    if (trxref != ref) {
      // for tests
      await Schema.TXN.findOneAndUpdate(
        {
          ref,
        },
        {
          status: "failed",
        }
      );
      req.flash("message", "Failed Transaction");
      res.redirect("/id");
    } else if (trxref == ref) {
      Schema.TXN.findOne({
        ref,
      })
        .then(($data) => {
          if ($data && $data.status != "paid" && $data.status != "cancelled") {
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
                      // No referer
                      console.log("x");
                      console.log(err);
                    }); // Crediting referer
                  Schema.User.findByIdAndUpdate(data._id, {
                    wallet: data.wallet + $data.amount, // adding to the inital wallet amount
                    level: {
                      level: data.level.level + 1,
                      date: new Date(),
                      updated: false,
                    }, // set to level 1
                  })
                    .then(async () => {
                      await Schema.TXN.findByIdAndUpdate($data._id, {
                        status: "paid",
                      });
                      const token = jwt.sign(
                        {
                          id: data._id,
                        },
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
    console.log(error);
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
  const ref = await Schema.User.find({ referer: user._id });
  res.render("dashboard", {
    user,
    withdraw: req.withdraw,
    message: req.flash("message"),
    referals: ref,
  });
});
app.get("/testimonial", (req, res) => {
  res.render("testimonial");
});

app.get("/profile", Block, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  res.render("profile", {
    user,
    message: req.flash("message"),
    success: req.flash("success"),
  });
});
app.get("/id", SignBlock, async (req, res) => {
  const { ref } = req.query;
  try {
    if (ref) {
      const referrer = await Schema.User.findById(ref);
      if (referrer)
        res.render("id", {
          flash: req.flash("message"),
          ref,
        });
      else throw 0;
    } else {
      res.render("id", {
        flash: req.flash("message"),
        ref: "",
      });
    }
  } catch (error) {
    req.flash("message", "Referral Code Error");
    res.redirect(`/id`);
  }
});
app.get("/contact", (req, res) => {
  res.render("contact", {
    message: req.flash("message"),
    success: req.flash("success"),
  });
});

app.delete("/logout", (req, res) => {
  res.clearCookie("user");
  res.end("");
});

app.post("/data-change", Block, (req, res) => {
  const { accNo, accName, bnkName } = req.body;
  if (
    !accNo.toString().trim() ||
    !accName.toString().trim() ||
    !bnkName.toString().trim()
  ) {
    req.flash("message", "Fill in all fields !");
    res.redirect("/profile");
  } else {
    Schema.User.findByIdAndUpdate(req.user, {
      accountName: accName.toString().trim(),
      bankName: bnkName.toString().trim(),
      accountNum: accNo.toString().trim(),
    })
      .then((d) => {
        req.flash("success", "Details updated");
        res.redirect("/profile");
      })
      .catch((err) => {
        console.log(err);
        req.flash("message", "Error updating details");
        res.redirect("/profile");
      });
  }
});

app.put("/withdraw", Block, async (req, res) => {
  // Withdrawal algorithm

  const user = await Schema.User.findById(req.user);
  const { amount } = req.body;
  const referees = user.referee;
  var num = 0;
  var people;
  if (referees.length > 0)
    people = await Schema.User.find({ referer: user._id });
  switch (user.level.level) {
    case 2:
      if (people.length >= 2) {
        people.forEach((data) => {
          if (data.level.level >= 1) num = num + 1;
        });
        console.log(num);
        res.end();
        if (num >= 2) {
          if (user.bankName && user.accountNum && user.accountName) {
            // Bank details exist
            if (user.wallet >= 2000) {
              if (Number(amount) >= 2000) {
                if (user.wallet >= Number(amount)) {
                  if (Number(amount) % 1000 > 0) {
                    res.status(406).end(); // Tell user to use rounded figues
                  } else {
                    res.end();
                    // Every criteria is filled
                    sendEmail({
                      title: "Crowd Fund Withdrawal request",
                      email: "gideoncode18@gmail.com",
                      message: `A withdrawal was request from a user with these details
                    <br/>
                    Name: ${user.fullname} <br/>
                    Email: ${user.email} <br/>
                    Name on Account: ${user.accountName} <br/>
                    BankName: ${user.bankName} <br/>
                    Account Number: ${user.accountNum} <br/>
                    Current Level: ${user.level.level} <br/>
                    Amount: ${amount} <br/>
                    Wallet Balance: ${user.wallet} <br/>
                    Time registered Level: ${new Date(
                      user.level.date
                    ).toDateString()} <br/>
                    `,
                      subject: "Withdrawal Request",
                    })
                      .then(async () => {
                        await sendEmail({
                          title: "Crowd Fund Withdrawal request",
                          email: user.email,
                          message: `Hello ${user.fullname}, Your withdrawal request has been sent for confirmation, the admin will attend to you shortly`,
                          subject: "Withdrawal Request",
                        });
                        await Schema.User.findByIdAndUpdate(req.user, {
                          wallet: user.wallet - Number(amount),
                        });
                        console.log(`Sent email to ${user.email}`);
                        res.end();
                      })
                      .catch((err) => {
                        console.log(err);
                        res.status(500).end();
                      });
                  }
                } else {
                  res.status(405).end(); // insufficent balance
                }
              } else {
                res.status(408).end(); // low amount
              }
            } else {
              if (amount) res.status(407).end(); // Account not up to 2k
              else res.status(203).end(); // closed modal
            }
          } else {
            if (!amount) res.status(203).end();
            else res.status(404).end();
          }
        } else {
          res.status(409).end();
        }
      } else {
        res.status(409).end();
      }
      break;

    case 7:
      if (referees.length >= 2) {
        people.forEach((data) => {
          if (data.level.level >= 1) num = num + 1;
        });
        if (num >= 2) {
          if (user.bankName && user.accountNum && user.accountName) {
            // Bank details exist
            if (user.wallet >= 2000) {
              if (Number(amount) >= 2000) {
                if (user.wallet >= Number(amount)) {
                  if (Number(amount) % 1000 > 0) {
                    res.status(406).end(); // Tell user to use rounded figues
                  } else {
                    // Every criteria is filled
                    sendEmail({
                      title: "Crowd Fund Withdrawal request",
                      email: "gideoncode18@gmail.com",
                      message: `A withdrawal was request from a user with these details
            <br/>
            Name: ${user.fullname} <br/>
            Email: ${user.email} <br/>
            Name on Account: ${user.accountName} <br/>
            BankName: ${user.bankName} <br/>
            Account Number: ${user.accountNum} <br/>
            Current Level: ${user.level.level} <br/>
            Amount: ${amount} <br/>
            Wallet Balance: ${user.wallet} <br/>
            Time registered Level: ${new Date(
              user.level.date
            ).toDateString()} <br/>
            `,
                      subject: "Withdrawal Request",
                    })
                      .then(async () => {
                        await sendEmail({
                          title: "Crowd Fund Withdrawal request",
                          email: user.email,
                          message: `Hello ${user.fullname}, You withdrawal request has been sent for confirmation, the admin will attend to you shortly`,
                          subject: "Withdrawal Request",
                        });
                        await Schema.User.findByIdAndUpdate(req.user, {
                          wallet: user.wallet - Number(amount),
                        });

                        console.log(`Sent email to ${user.email}`);
                        res.end();
                      })
                      .catch((err) => {
                        console.log(err);
                        res.status(500).end();
                      });
                  }
                } else {
                  res.status(405).end(); // insufficent balance
                }
              } else {
                res.status(408).end(); // low amount
              }
            } else {
              if (amount) res.status(407).end(); // Account not up to 2k
              else res.status(203).end(); // closed modal
            }
          } else {
            if (!amount) res.status(203).end();
            else res.status(404).end();
          }
        } else {
          res.status(409).end();
        }
      } else {
        res.status(409).end();
      }
      break;

    case 4:
      if (referees.length >= 2) {
        people.forEach((data) => {
          if (data.level.level >= 2) num = num + 1;
        });
        if (num >= 2) {
          if (user.bankName && user.accountNum && user.accountName) {
            // Bank details exist
            if (user.wallet >= 2000) {
              if (Number(amount) >= 2000) {
                if (user.wallet >= Number(amount)) {
                  if (Number(amount) % 1000 > 0) {
                    res.status(406).end(); // Tell user to use rounded figues
                  } else {
                    // Every criteria is filled
                    sendEmail({
                      title: "Crowd Fund Withdrawal request",
                      email: "gideoncode18@gmail.com",
                      message: `A withdrawal was request from a user with these details
            <br/>
            Name: ${user.fullname} <br/>
            Email: ${user.email} <br/>
            Name on Account: ${user.accountName} <br/>
            BankName: ${user.bankName} <br/>
            Account Number: ${user.accountNum} <br/>
            Current Level: ${user.level.level} <br/>
            Amount: ${amount} <br/>
            Wallet Balance: ${user.wallet} <br/>
            Time registered Level: ${new Date(
              user.level.date
            ).toDateString()} <br/>
            `,
                      subject: "Withdrawal Request",
                    })
                      .then(async () => {
                        await sendEmail({
                          title: "Crowd Fund Withdrawal request",
                          email: user.email,
                          message: `Hello ${user.fullname}, You withdrawal request has been sent for confirmation, the admin will attend to you shortly`,
                          subject: "Withdrawal Request",
                        });
                        await Schema.User.findByIdAndUpdate(req.user, {
                          wallet: user.wallet - Number(amount),
                        });

                        console.log(`Sent email to ${user.email}`);
                        res.end();
                      })
                      .catch((err) => {
                        console.log(err);
                        res.status(500).end();
                      });
                  }
                } else {
                  res.status(405).end(); // insufficent balance
                }
              } else {
                res.status(408).end(); // low amount
              }
            } else {
              if (amount) res.status(407).end(); // Account not up to 2k
              else res.status(203).end(); // closed modal
            }
          } else {
            if (!amount) res.status(203).end();
            else res.status(404).end();
          }
        } else {
          res.status(409).end();
        }
      } else {
        res.status(409).end();
      }
      break;

    default:
      Norm();
      break;
  }

  function Norm() {
    // No hitch withdrawal

    if (user.bankName && user.accountNum && user.accountName) {
      // Bank details exist
      if (user.wallet >= 2000) {
        if (Number(amount) >= 2000) {
          if (user.wallet >= Number(amount)) {
            if (Number(amount) % 1000 > 0) {
              res.status(406).end(); // Tell user to use rounded figues
            } else {
              // Every criteria is filled
              sendEmail({
                title: "Crowd Fund Withdrawal request",
                email: "gideoncode18@gmail.com",
                message: `A withdrawal was request from a user with these details
          <br/>
          Name: ${user.fullname} <br/>
          Email: ${user.email} <br/>
          Name on Account: ${user.accountName} <br/>
          BankName: ${user.bankName} <br/>
          Account Number: ${user.accountNum} <br/>
          Current Level: ${user.level.level} <br/>
          Amount: ${amount} <br/>
          Wallet Balance: ${user.wallet} <br/>
          Time registered Level: ${new Date(
            user.level.date
          ).toDateString()} <br/>
          `,
                subject: "Withdrawal Request",
              })
                .then(async () => {
                  await sendEmail({
                    title: "Crowd Fund Withdrawal request",
                    email: user.email,
                    message: `Hello ${user.fullname}, You withdrawal request has been sent for confirmation, the admin will attend to you shortly`,
                    subject: "Withdrawal Request",
                  });
                  await Schema.User.findByIdAndUpdate(req.user, {
                    wallet: user.wallet - Number(amount),
                  });

                  console.log(`Sent email to ${user.email}`);
                  res.end();
                })
                .catch((err) => {
                  console.log(err);
                  res.status(500).end();
                });
            }
          } else {
            res.status(405).end(); // insufficent balance
          }
        } else {
          res.status(408).end(); // low amount
        }
      } else {
        if (amount) res.status(407).end(); // Account not up to 2k
        else res.status(203).end(); // closed modal
      }
    } else {
      if (!amount) res.status(203).end();
      else res.status(404).end();
    }
  }
});

app.post("/level-up", Block, async (req, res) => {
  const user = await Schema.User.findById(req.user);
  switch (user.level.level) {
    case 1:
      // Move to level 2
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 2 * 100000,
        txn_p: 2000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    case 2:
      // Move to level 3
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 4 * 100000,
        txn_p: 4000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    case 3:
      // Move to level 4
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 8 * 100000,
        txn_p: 8000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    case 4:
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 16 * 100000,
        txn_p: 16000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    case 5:
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 32 * 100000,
        txn_p: 32000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    case 6:
      pay({
        path: "pay-upgrade",
        owner: user,
        tx_ref: randomGen(10),
        price: 64 * 100000,
        txn_p: 64000,
      })
        .then((d) => {
          res.redirect(d);
        })
        .catch((err) => {
          console.log(err);
          req.flash("message", "Couldn't initiate transaction, try again");
          res.redirect("/dashboard");
        });
      break;
    default:
      req.flash("message", "Max Level Reached");
      res.redirect("/id");
      break;
  }
});

app.get("/pay-upgrade/:ref", async (req, res) => {
  try {
    const $ = req.params.ref;
    const ref = Buffer.from($, "base64").toString("utf-8");
    const { trxref } = req.query;
    if (trxref != ref) {
      // for tests
      await Schema.TXN.findOneAndUpdate(
        {
          ref,
        },
        {
          status: "failed",
        }
      );
      req.flash("message", "Failed Transaction");
      res.redirect("/id");
    } else if (trxref == ref) {
      Schema.TXN.findOne({
        ref,
      })
        .then(($data) => {
          if ($data && $data.status != "paid" && $data.status != "cancelled") {
            // Check if transaction reference is not already paid
            Schema.User.findById($data.owner) // New user being created
              .then((data) => {
                if (data) {
                  // If user found, update transaction to found and edit level.
                  Schema.User.findByIdAndUpdate(data._id, {
                    wallet: data.wallet + $data.amount, // adding to the inital wallet amount
                    level: {
                      level: data.level.level + 1,
                      date: new Date(),
                      updated: false,
                    }, // set to level 1
                  })
                    .then(async () => {
                      await Schema.TXN.findByIdAndUpdate($data._id, {
                        status: "paid",
                      });
                      const token = jwt.sign(
                        {
                          id: data._id,
                        },
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
    console.log(error);
    req.flash("message", "Error Validating Transaction.");
    res.redirect("/id");
  }
});

app.post("/support", (req, res) => {
  const { email, name, phone, message } = req.body;
  if (!email.toString().trim()) {
    req.flash("message", "Fill in all fields");
    res.redirect("/contact");
  } else {
    sendEmail({
      title: `Message from ${email}`,
      email: "gideoncode18@gmail.com",
      message: `${message}  <br/> PhoneNumber: ${phone}`,
      subject: `You have a message from ${name}`,
    })
      .then((d) => {
        console.log(`email sent`);
        req.flash("success", "Message sent !,");
        res.redirect("/contact");
      })
      .catch((err) => {
        req.flash("message", "There was error, try again");
        res.redirect("/contact");
      });
  }
});

app.use((req, res) => {
  // 404 page
  res.send("Page requested not found <br> <a href='/'>Go home</a>");
});
module.exports = app;
