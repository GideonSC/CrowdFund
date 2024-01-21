const transporter = require("./transporter");
function sendEmail({ message, title, subject, link, email }) {
  const mailData = {
    from: title + "<crowdfundng1@gmail.com>",
    to: email,
    subject,
    html: `
    <div style="background-color: #f1f1f1; padding: 1em; text-align: center">
    <h1>${subject}</h1>
    <p style="margin-bottom: 1em">
     ${message}<br />
    </p>
    ${link ? `<a href="${link}">Click to verify</a> <br/>` : ""}
   
    <small>Copyright© CrowdFund ${new Date().getFullYear()} </small>
   </div>
      `,
  };

  return new Promise((resolve, reject) => {
    transporter
      .verify()
      .then(() => {
        transporter.sendMail(mailData, (err, infomation) => {
          if (err) {
            reject(err);
          } else resolve(infomation);
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}
module.exports = sendEmail;
