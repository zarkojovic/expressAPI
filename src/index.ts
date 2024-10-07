import "dotenv/config";
import "express-async-errors";
import express, { RequestHandler } from "express";
import authRouter from "routes/auth";
import "src/db";
import formidable from "formidable";
import path from "path";
import productRouter from "./routes/product";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("src/public"));

// FILE UPLOAD EXAMPLE
app.post("/upload-file", async (req, res) => {
  const form = formidable({
    uploadDir: path.join(__dirname, "public"),
    filename(name, ext, part, form) {
      return Date.now() + "_" + part.originalFilename;
    },
  });
  await form.parse(req);
  res.send("File uploaded successfully");
});

// API ROUTES
app.use("/auth", authRouter);
app.use("/product", productRouter);

app.use(function (err, req, res, next) {
  res.status(500).json({ message: err.message });
} as express.ErrorRequestHandler);

app.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
