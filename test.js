
// Install first:
// npm install nodemailer

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "akshayparte580@gmail.com",
    pass: "ltjs kcii nhil zfec", // Put your passkey/app password here
  },
});

const mailOptions = {
  from: "akshayparte580@gmail.com",
  to: "akshayparte123@hotmail.com",
  subject: "Test Email",
  text: "Hello Akshay! This email was sent using Node.js and Nodemailer.",
  // html: "<h1>Hello Akshay!</h1><p>This email was sent using Node.js.</p>",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Email sent successfully!");
  console.log("Message ID:", info.messageId);
});
