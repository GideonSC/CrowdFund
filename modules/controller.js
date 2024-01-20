const x = require("./schema");
const { User } = x;
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
