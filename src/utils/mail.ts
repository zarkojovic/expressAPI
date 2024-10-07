import nodemailer from "nodemailer";

// Looking to send emails in production? Check out our Email API/SMTP product!
var transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "3e1eed1d62b46d",
    pass: "fb8953b07184c3",
  },
});

const sendVerificationMail = async (email: string, link: string) => {
  await transport.sendMail({
    from: "verification@myapp.com",
    to: email,
    html: `<h1>Click <a href="${link}">here</a> to verify your email</h1>`,
  });
};

const sendPasswordResetLink = async (email: string, link: string) => {
  await transport.sendMail({
    from: "verification@myapp.com",
    to: email,
    html: `<h1>Please click on <a href="${link}">here</a> to update your password.</h1>`,
  });
};

const sendPasswordUpdateMessage = async (email: string) => {
  await transport.sendMail({
    from: "verification@myapp.com",
    to: email,
    html: `<h1>Your password is updated, you can use your new password now.</h1>`,
  });
};

export const mail = {
  sendVerificationMail,
  sendPasswordResetLink,
  sendPasswordUpdateMessage,
};
