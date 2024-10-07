import { UploadApiResponse } from "cloudinary";
import { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import cloudUploader from "src/cloud";
import ProductModel from "src/models/product";
import { sendErrorRes } from "src/utils/helper";

const uploadImage = (filePath: string): Promise<UploadApiResponse> => {
  return cloudUploader.upload(filePath, {
    width: 1280,
    height: 720,
    crop: "fill",
  });
};

export const listNewProduct: RequestHandler = async (req, res) => {
  const { name, price, category, description, purchasingDate } = req.body;
  const newProduct = new ProductModel({
    owner: req.user.id,
    name,
    price,
    category,
    description,
    purchasingDate,
  });

  const { images } = req.files;

  let invalidFileType = false;

  const isMultipleImages = Array.isArray(images);

  if (isMultipleImages && images.length > 5) {
    return sendErrorRes(res, "Only 5 images are allowed", 422);
  }

  if (isMultipleImages) {
    for (let img of images) {
      if (!img.mimetype?.startsWith("image")) {
        invalidFileType = true;
        break;
      }
    }
  } else {
    if (!images.mimetype?.startsWith("image")) {
      invalidFileType = true;
    }
  }

  if (invalidFileType) {
    return sendErrorRes(res, "Only images are allowed", 422);
  }

  // file upload
  if (isMultipleImages) {
    const uploadPromies = images.map((file) => uploadImage(file.filepath));
    const uploadResults = await Promise.all(uploadPromies);
    newProduct.images = uploadResults.map(({ secure_url, public_id }) => ({
      url: secure_url,
      id: public_id,
    }));

    newProduct.thumbnail = newProduct.images[0].url;
  } else {
    if (images) {
      const { secure_url, public_id } = await uploadImage(images.filepath);
      newProduct.images = [{ url: secure_url, id: public_id }];
      newProduct.thumbnail = secure_url;
    }
  }

  await newProduct.save();

  res.status(201).json({ message: "Product created successfully" });
};

export const updateProduct: RequestHandler = async (req, res) => {
  const productId = req.params.id;
  const { name, price, category, description, purchasingDate, thumbnail } =
    req.body;

  if (!isValidObjectId(productId)) {
    return sendErrorRes(res, "Invalid product id", 422);
  }

  const product = await ProductModel.findOneAndUpdate(
    {
      _id: productId,
      owner: req.user.id,
    },
    {
      name,
      price,
      category,
      description,
      purchasingDate,
      thumbnail,
    },
    {
      new: true,
    }
  );

  if (!product) return sendErrorRes(res, "Product not found", 404);

  if (typeof thumbnail === "string") product.thumbnail = thumbnail;

  const { images } = req.files;
  const isMultipleImages = Array.isArray(images);

  if (isMultipleImages) {
    if (images.length + product.images.length > 5) {
      return sendErrorRes(res, "Only 5 images are allowed", 422);
    }
  }

  let invalidFileType = false;

  if (images) {
    if (isMultipleImages) {
      for (let img of images) {
        if (!img.mimetype?.startsWith("image")) {
          invalidFileType = true;
          break;
        }
      }
    } else {
      if (!images.mimetype?.startsWith("image")) {
        invalidFileType = true;
      }
    }
  }

  if (invalidFileType) {
    return sendErrorRes(res, "Only images are allowed", 422);
  }

  // file upload
  if (isMultipleImages) {
    const uploadPromies = images.map((file) => uploadImage(file.filepath));
    const uploadResults = await Promise.all(uploadPromies);
    const newImages = uploadResults.map(({ secure_url, public_id }) => ({
      url: secure_url,
      id: public_id,
    }));

    product.images.push(...newImages);
  } else {
    if (images) {
      const { secure_url, public_id } = await uploadImage(images.filepath);

      product.images.push({ url: secure_url, id: public_id });
    }
  }

  await product.save();

  res.status(201).json({ message: "Product updated successfully" });
};
