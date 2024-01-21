const mongoose = require("mongoose");
const User = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    accountNum: {
      type: String,
    },
    accountName: {
      type: String,
    },
    bankName: {
      type: String,
    },
    level: {
      type: Object,
      required: true,
    },
    referee: {
      // People you've referred
      type: Array,
      default: [],
    },
    referer: {
      // The person that referred you
      type: String,
    },
    wallet: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);
const TXN = new mongoose.Schema(
  {
    ref: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
); // Transaction record schema
module.exports.User = mongoose.model("user", User);
module.exports.TXN = mongoose.model("transaction", TXN);
