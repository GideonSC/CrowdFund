const x = require("./schema");
const jwt = require("jsonwebtoken");
const Pay = require("./pay");
const { User } = x;
const random = require("./randomNum");

const cookieopts = {
  maxAge: 60 * 300 * 1000, // 15hrs
  httpOnly: true,
  sameSite: "lax",
};

module.exports.levelAuth = (req, res, done) => {
  User.findById(req.user)
    .then(async (data) => {
      if (data) {
        const createdAT = new Date(data.level.date).getDate();
        const currentDate = new Date().getDate();
        const currentTime = new Date().getHours();
        const createdATtime = new Date(data.level.date).getHours();
        switch (data.level.level) {
          case 1:
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 1000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 2:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 2000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 3:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 4000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 4:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 8000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 5:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 16000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 6:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 32000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          case 7:
            // Level 2
            if (
              Number(currentDate) - Number(createdAT) >= data.level.level &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 64000,
                level: {
                  level: data.level.level,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              if (data.level.updated == true) {
                req.withdraw = true;
              } else req.withdraw = false;
              done();
            }
            break;

          default:
            done();
            break;
        }
      } else throw 0;
    })
    .catch((err) => {
      console.log(err);
      res.clearCookie("user");
      req.flash("message", "Please Login");
      res.redirect("/id");
    });
};
module.exports.payAuth = async (req, res) => {
  // Check level
  const user = await User.findById(req.user);
  if (user.level.level <= 0) {
    // User has not signed up
    Pay({
      price: 4 * 100000,
      tx_ref: random(10),
      txn_p: 1000,
      owner: user,
    })
      .then((data) => {
        res.redirect(data);
      })
      .catch((err) => {
        console.log(err);
        req.flash("message", "Failed to initiate payment.");
        res.redirect("/id");
      });
  } else {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "5hrs",
    });
    res.cookie("user", token, cookieopts);
    res.redirect("/dashboard");
  }
};
