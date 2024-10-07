import { isValidObjectId } from "mongoose";
import * as yup from "yup";
import categories from "./categories";
import { parseISO } from "date-fns";

const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

yup.addMethod(yup.string, "email", function (message) {
  return this.matches(emailRegex, {
    message,
    name: "email",
    excludeEmptyString: true,
  });
});

const password = {
  password: yup
    .string()
    .matches(
      passwordRegex,
      "Password must contain at least 8 characters, one uppercase, one lowercase, one number"
    )
    .required(),
};

const tokenAndId = {
  id: yup.string().test({
    name: "valid-id",
    message: "Invalid user ID",
    test: (value) => {
      return isValidObjectId(value);
    },
  }),
  token: yup.string().required("Token is required"),
};

export const newUserSchema = yup.object({
  email: yup
    .string()
    .email("Email is invalid! Example: test@gmail.com")
    .required(),
  ...password,
  name: yup.string().required(),
});

export const verifyTokenSchema = yup.object({
  ...tokenAndId,
});

export const resetPassSchema = yup.object({
  ...tokenAndId,
  ...password,
});

export const newProductSchema = yup.object({
  name: yup.string().required("Name is missing!"),
  description: yup.string().required("Description is missing!"),
  category: yup
    .string()
    .oneOf(categories, "Invalid category!")
    .required("Category is missing!"),
  price: yup
    .string()
    .transform((value) => {
      if (!isNaN(+value)) return +value;
      return NaN;
    })
    .required("Price is missing!"),
  purchasingDate: yup
    .string()
    .transform((value) => {
      try {
        return parseISO(value);
      } catch (e) {
        return "";
      }
    })
    // .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    .required("Purchasing date is missing!"),
});
