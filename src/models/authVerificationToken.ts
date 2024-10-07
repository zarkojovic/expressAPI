import { Schema, model } from "mongoose";
import { compare, genSalt, hash } from "bcrypt";

interface AuthVerificationTokenDocument extends Document {
  owner: Schema.Types.ObjectId;
  token: string;
  createdAt: Date;
}

interface Methods {
  compareToken(token: string): Promise<boolean>;
}

const schema = new Schema<AuthVerificationTokenDocument, {}, Methods>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    expires: 3600 * 24, // 24 hours
  },
});

schema.pre("save", async function (next) {
  if (this.isModified("token")) {
    const salt = await genSalt(10);
    this.token = await hash(this.token, salt);
  }

  next();
});

schema.methods.compareToken = async function (token) {
  return await compare(token, this.token);
};

const AuthVerificationToken = model("AuthVerificationToken", schema);

export default AuthVerificationToken;
