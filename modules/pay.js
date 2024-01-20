// Payment fxn
const Axios = require("request-promise");
const Schema = require("./schema");
module.exports = async ({ price, tx_ref, txn_p, owner }) => {
  const body = JSON.stringify({
    tx_ref,
    amount: price,
    currency: "NGN",
    customer: {
      email: owner.email,
    },
    payment_options: "card, ussd, banktransfer",
    redirect_url: `https://crowdfunds.com.ng/pay-ver/${Buffer.from(
      tx_ref
    ).toString("base64")}`, // Change this to actual route
  });
  const TXN = new Schema.TXN({
    amount: txn_p, // Amount to credit user
    ref: tx_ref,
    owner: owner._id,
    status: "pending",
  });
  await TXN.save();
  return new Promise((resolve, reject) => {
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
        resolve(resp.data.link); // Redirect to flutterwave payment modal
      })
      .catch((err) => {
        reject(err);
      });
  });
};
