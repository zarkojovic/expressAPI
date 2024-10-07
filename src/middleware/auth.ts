import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import UserModel from "src/models/user";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  verified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user: UserProfile;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

export const isAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tokenValue = token.split("Bearer ")[1];
    // Verify token
    const payload = jwt.verify(tokenValue, JWT_SECRET) as { id: string };

    // Get user from DB
    const user = await UserModel.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      verified: user.verified,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    next(error);
  }
};
