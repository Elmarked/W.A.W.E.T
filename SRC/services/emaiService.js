const nodemailer = require('nodemailer');

async function sendConfirmationEmail(to, hash) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Wallpaper Upload Confirmation",
    text: `SHA-256 Hash: ${hash}`
  });
}

module.exports = { sendConfirmationEmail };
