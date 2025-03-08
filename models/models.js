// models/models.js
const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  mail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phonenumber: { type: String },
  location: { type: String },
  pic: { type: Buffer }, // Store image as binary data
  type: { type: String, enum: ["user", "farmer"], default: "user" },
});

// Blog Schema
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  images: [{ type: Buffer }], // Store images as binary data
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  category: { type: String },
});

// Product Schema
const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  productName: { type: String, required: true },
  productId: { type: String, required: true },
  productType: { type: String, enum: ["fertilizer", "pesticide", "crop"] },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: Buffer }, // Store image as binary data
});

// Shop Schema
const shopSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: Buffer }, // Store image as binary data
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  location: { type: String, required: true },
  ownerName: { type: String, required: true },
});

// MarketPrice Schema
const marketPriceSchema = new mongoose.Schema({
  item: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ["vegetable", "fruits", "paddycrops"] },
});

// Training Schema
const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  link: { type: String, required: true },
});

const cartSchema = new mongoose.Schema({
  productid: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  qty: { type: Number, required: true, min: 1 }
});

// Create Models
const User = mongoose.model("User", userSchema);
const Blog = mongoose.model("Blog", blogSchema);
const Product = mongoose.model("Product", productSchema);
const Shop = mongoose.model("Shop", shopSchema);
const MarketPrice = mongoose.model("MarketPrice", marketPriceSchema);
const Training = mongoose.model("Training", trainingSchema);
const Cart = mongoose.model("Cart", cartSchema)



// Export Models
module.exports = { User, Blog, Product, Shop, MarketPrice, Training, Cart };

