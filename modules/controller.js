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
        switch (data.level.level) {
          case 1:
            const createdAT = new Date(data.level.date).getDate();
            const currentDate = new Date().getDate();
            const currentTime = new Date().getHours();
            const createdATtime = new Date(data.level.date).getHours();
            if (
              Number(currentDate) - Number(createdAT) >= 1 &&
              Number(currentTime) - Number(createdATtime) >= 0 &&
              data.level.updated === false
            ) {
              // 24 hrs
              await User.findByIdAndUpdate(req.user, {
                wallet: data.wallet + 1000,
                level: {
                  level: 1,
                  date: data.level.date,
                  updated: true,
                },
              });
              done();
              req.withdraw = true;
            } else {
              // Havent reached
              await User.findByIdAndUpdate(req.user, {
                level: {
                  level: 1,
                  date: data.level.date,
                  updated: false,
                },
              });
              done();
              req.withdraw = false;
            }
            break;

          default:
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
      price: 4000,
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
