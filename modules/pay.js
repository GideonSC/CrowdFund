// Payment fxn
const Axios = require("request-promise");
const Schema = require("./schema");
module.exports = async ({ price, tx_ref, txn_p, path, owner }) => {
  var x;
  if (path) {
    x = `https://crowdfunds.com.ng/${path}/${Buffer.from(tx_ref).toString(
      "base64"
    )}`;
  } else {
    x = `https://crowdfunds.com.ng/pay-ver/${Buffer.from(tx_ref).toString(
      "base64"
    )}`;
  }

  const body = JSON.stringify({
    reference: tx_ref,
    amount: price,
    currency: "NGN",
    email: owner.email,
    channels: ["card", "mobile_money", "bank_transfer"],
    callback_url: x, // Change this to actual route
  });
  const TXN = new Schema.TXN({
    amount: txn_p, // Amount to credit user
    ref: tx_ref,
    owner: owner._id,
    status: "pending",
  });
  await TXN.save();
  return new Promise((resolve, reject) => {
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
        resolve(resp.data.authorization_url); // Redirect to flutterwave payment modal
      })
      .catch((err) => {
        reject(err);
      });
  });
};
