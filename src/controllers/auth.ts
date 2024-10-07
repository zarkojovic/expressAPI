import { RequestHandler } from "express";
import UserModel from "src/models/user";
import crypto from "crypto";
import AuthVerificationToken from "src/models/authVerificationToken";
import nodemailer from "nodemailer";
import { sendErrorRes } from "src/utils/helper";
import jwt from "jsonwebtoken";
import { mail } from "src/utils/mail";
import { v2 as cloudinary } from "cloudinary";
import PasswordResetTokenModel from "src/models/passwordResetToken";
import { isValidObjectId } from "mongoose";
import cloudUploader from "src/cloud";

const VERIFICATION_LINK = process.env.VERIFICATION_LINK;
const PASSWORD_RESET_LINK = process.env.PASSWORD_RESET_LINK;
const JWT_SECRET = process.env.JWT_SECRET!;

export const createNewUser: RequestHandler = async (req, res) => {
  // Read incoming data like: name, email, password
  const { email, password, name } = req.body;

  const existinguser = await UserModel.findOne({ email });

  // Check if the user already exists
  if (existinguser) {
    return sendErrorRes(res, "User already exists", 409);
  }

  // Create a new user
  const user = await UserModel.create({ email, password, name });

  const token = crypto.randomBytes(36).toString("hex");

  await AuthVerificationToken.create({
    owner: user._id,
    token,
  });

  const link = VERIFICATION_LINK + `?id=${user._id}&token=${token}`;

  await mail.sendVerificationMail(email, link);

  res.status(201).json({ message: "Please verify your email" });
};

export const verifyEmail: RequestHandler = async (req, res) => {
  const { id, token } = req.body;

  const authToken = await AuthVerificationToken.findOne({ owner: id });

  if (!authToken) return sendErrorRes(res, "Invalid token", 403);

  const isMatched = authToken.compareToken(token);

  if (!isMatched) return sendErrorRes(res, "Invalid token", 403);

  await UserModel.findByIdAndUpdate(id, { verified: true });

  await AuthVerificationToken.findByIdAndDelete(authToken._id);

  res.status(200).json({ message: "Email verified" });
};

export const signIn: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email });

  if (!user) return sendErrorRes(res, "Invalid email or password", 401);

  const isMatched = await user.comparePassword(password);

  if (!isMatched) return sendErrorRes(res, "Invalid email or password", 401);

  const payload = { id: user._id };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET);

  if (!user.tokens) {
    user.tokens = [refreshToken];
  } else user.tokens.push(refreshToken);

  await user.save();

  res.json({
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.verified,
    },
    tokens: {
      access: accessToken,
      refresh: refreshToken,
    },
  });
};

export const getProfile: RequestHandler = async (req, res) => {
  res.json({
    profile: req.user,
  });
};

export const verifyToken: RequestHandler = async (req, res) => {
  const { id, email } = req.user;
  // remove previous token if any
  const token = crypto.randomBytes(36).toString("hex");

  const link = VERIFICATION_LINK + `?id=${id}&token=${token}`;

  await AuthVerificationToken.findOneAndDelete({ owner: id });

  // create new token and send it back
  await AuthVerificationToken.create({
    owner: id,
    token: token,
  });

  await mail.sendVerificationMail(email, link);

  res.json({ message: "Please verify your email" });
};

export const grantAccessToken: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return sendErrorRes(res, "Unauthorized", 401);

  const payload = jwt.verify(refreshToken, JWT_SECRET) as { id: string };

  if (!payload.id) return sendErrorRes(res, "Unauthorized", 401);

  const user = await UserModel.findOne({
    _id: payload.id,
    tokens: refreshToken,
  });

  if (!user) {
    await UserModel.findByIdAndUpdate(payload.id, { tokens: [] });
    return sendErrorRes(res, "Unauthorized", 401);
  }

  const newAccessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const newRefreshToken = jwt.sign({ id: user._id }, JWT_SECRET);

  user.tokens = user.tokens.filter((token) => token !== refreshToken);
  user.tokens.push(newRefreshToken);

  await user.save();

  return res.json({
    tokens: {
      access: newAccessToken,
      refresh: newRefreshToken,
    },
  });
};

export const signOut: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body;

  const user = await UserModel.findOne({
    _id: req.user.id,
    tokens: refreshToken,
  });

  if (!user) {
    return sendErrorRes(res, "Unauthorized", 401);
  }

  user.tokens = user.tokens.filter((token) => token !== refreshToken);

  await user.save();

  res.json({ message: "Signed out" });
};

export const generateForgetPasswordLink: RequestHandler = async (req, res) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });

  if (!user) return sendErrorRes(res, "User not found", 404);

  // Remove token
  await PasswordResetTokenModel.findOneAndDelete({ owner: user._id });

  // Create new Token
  const token = crypto.randomBytes(36).toString("hex");
  await PasswordResetTokenModel.create({
    owner: user._id,
    token: token,
  });

  // Send email with link
  const passwordResetLink =
    PASSWORD_RESET_LINK + `?id=${user._id}&token=${token}`;

  mail.sendPasswordResetLink(user.email, passwordResetLink);

  // Send response
  res.json({ message: "Password reset link sent" });
};

export const isValidPassResetToken: RequestHandler = async (req, res, next) => {
  const { id, token } = req.body;

  const passResetToken = await PasswordResetTokenModel.findOne({ owner: id });

  if (!passResetToken) return sendErrorRes(res, "Invalid token", 403);

  const isMatched = passResetToken.compareToken(token);
  if (!isMatched) return sendErrorRes(res, "Invalid token", 403);

  next();
};

export const grantValid: RequestHandler = async (req, res) => {
  res.json({ valid: true });
};

export const updatePassword: RequestHandler = async (req, res) => {
  const { id, password } = req.body;

  const user = await UserModel.findById(id);

  if (!user) return sendErrorRes(res, "User not found", 404);

  const matched = await user.comparePassword(password);

  if (matched) return sendErrorRes(res, "New password cannot be the same", 400);

  user.password = password;

  await user.save();

  await PasswordResetTokenModel.findOneAndDelete({ owner: id });

  await mail.sendPasswordUpdateMessage(user.email);

  res.json({ message: "Password updated successfully!" });
};

export const updateProfile: RequestHandler = async (req, res) => {
  const { id, name } = req.body;

  if (typeof name !== "string" || name.trim().length < 3) {
    return sendErrorRes(res, "Invalid name", 422);
  }

  await UserModel.findByIdAndUpdate(req.user.id, { name });

  res.json({
    profile: {
      ...req.user,
      name,
    },
  });
};

export const updateAvatar: RequestHandler = async (req, res) => {
  const { avatar } = req.files;

  if (!avatar) {
    return sendErrorRes(res, "No file found", 422);
  }

  if (Array.isArray(avatar)) {
    return sendErrorRes(res, "Only one file is allowed", 422);
  }

  if (!avatar.mimetype?.startsWith("image")) {
    return sendErrorRes(res, "Only images are allowed", 422);
  }

  const user = await UserModel.findById(req.user.id);

  if (!user) {
    return sendErrorRes(res, "User not found", 404);
  }

  if (user.avatar?.id) {
    await cloudUploader.destroy(user.avatar.id);
  }

  // upload file
  const { secure_url: url, public_id: id } = await cloudUploader.upload(
    avatar.filepath,
    {
      width: 300,
      height: 300,
      crop: "thumb",
      gravity: "face",
    }
  );

  user.avatar = { url, id };

  await user.save();

  res.json({
    profile: {
      ...req.user,
      avatar: user.avatar.url,
    },
  });
};

export const sendPublicProfile: RequestHandler = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) return sendErrorRes(res, "Invalid id", 400);

  const user = await UserModel.findById(id);

  if (!user) return sendErrorRes(res, "User not found", 404);

  res.json({
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar?.url,
    },
  });
};
