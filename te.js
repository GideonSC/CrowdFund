const random = require("./modules/randomNum");
console.log(Buffer.from(random(10)).toString("base64"));
