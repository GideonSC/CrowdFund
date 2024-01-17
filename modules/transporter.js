const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.MAILER_PASSWORD,
  },
  port: 465,
  host: "smtp.gmail.com",
  secure: true,
});
module.exports = transporter;
