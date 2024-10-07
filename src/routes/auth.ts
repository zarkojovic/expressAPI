import exp from "constants";
import { Router } from "express";
import {
  createNewUser,
  verifyEmail,
  signIn,
  getProfile,
  verifyToken,
  grantAccessToken,
  signOut,
  generateForgetPasswordLink,
  isValidPassResetToken,
  grantValid,
  updatePassword,
  updateProfile,
  updateAvatar,
  sendPublicProfile,
} from "controllers/auth";
import {
  newUserSchema,
  resetPassSchema,
  verifyTokenSchema,
} from "src/utils/validationSchema";
import validate from "src/middleware/validator";
import { isAuth } from "src/middleware/auth";
import fileParser from "src/middleware/fileParser";
const authRouter = Router();

authRouter.post("/sign-up", validate(newUserSchema), createNewUser);
authRouter.post("/verify", validate(verifyTokenSchema), verifyEmail);
authRouter.post("/sign-in", signIn);
authRouter.get("/profile", isAuth, getProfile);
authRouter.get("/verify-token", isAuth, verifyToken);
authRouter.post("/refresh-token", grantAccessToken);
authRouter.post("/sign-out", isAuth, signOut);
authRouter.post("/forget-password", generateForgetPasswordLink);
authRouter.post(
  "/verify-pass-reset-token",
  validate(verifyTokenSchema),
  isValidPassResetToken,
  grantValid
);
authRouter.post(
  "/reset-pass",
  validate(resetPassSchema),
  isValidPassResetToken,
  updatePassword
);
authRouter.patch("/update-profile", isAuth, updateProfile);
authRouter.patch("/update-avatar", isAuth, fileParser, updateAvatar);
authRouter.get("/profile/:id", isAuth, sendPublicProfile);
export default authRouter;
