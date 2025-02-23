// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

// Import models
const { User, Blog, Product, Shop, MarketPrice, Training } = require("./models/models");

const app = express();
const port = 3000;
const dbUrl = "mongodb+srv://admin:admin123@cluster0.xnhgc.mongodb.net/farm_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

  // Middleware to parse JSON bodies
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });


// Signup endpoint: Creates a new user
app.post("/signup", upload.single("pic"), async (req, res) => {
  try {
    const { username, mail, password, phonenumber, location, type } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      mail,
      password: hashedPassword,
      phonenumber,
      location,
      pic: req.file ? req.file.buffer : null, // Store image as binary data
      type,
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Login endpoint: Authenticates a user
app.post("/login", async (req, res) => {
  try {
    const { mail, password } = req.body;
    const user = await User.findOne({ mail });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    res.json({ message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Create a blog with images
app.post("/blogs", upload.array("images", 5), async (req, res) => {
  try {
    const { title, content, userId, category } = req.body;
    const images = req.files.map((file) => file.buffer); // Store images as binary data

    const newBlog = new Blog({
      title,
      images,
      content,
      userId,
      category,
    });

    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all blogs
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().populate("userId", "username");
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// **Fetch blogs by Title**
app.get("/blogs/:title", async (req, res) => {
  try {
    const blogs = await Blog.find({ title: { $regex: req.params.title, $options: "i" } });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// **Fetch blogs by Username**
app.get("/blogs/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const blogs = await Blog.find({ userId: user._id });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get a blog by ID
app.get("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a blog
app.put("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Delete a blog
app.delete("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json({ message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Create a product
app.post("/products", upload.single("image"), async (req, res) => {
  try {
    // Log the request body and file
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    // Extract fields from the request body
    const { userId, productName, productId, productType, price, quantity } = req.body;

    // Create a new product
    const newProduct = new Product({
      userId,
      productName,
      productId,
      productType,
      price: parseFloat(price), // Ensure price is a number
      quantity: parseInt(quantity), // Ensure quantity is a number
      image: req.file ? req.file.buffer : null, // Store image as binary data
    });

    // Save the product to the database
    await newProduct.save();

    // Send the response
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


//get product by id
app.get("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params; // Extract productId from the URL

    // Find the product by productId
    const product = await Product.findOne({ productId });

    // If the product is not found, return a 404 error
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return the product
    res.json(product);
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});



// Endpoint to retrieve products by productName
app.get("/products", async (req, res) => {
  try {
    const { productName } = req.query; // Extract productName from the query parameters

    // Validate productName
    if (!productName) {
      return res.status(400).json({ error: "productName is required" });
    }

    // Find all products with the specified productName (case-insensitive search)
    const products = await Product.find({ productName: { $regex: productName, $options: "i" } });

    // If no products are found, return a 404 error
    if (products.length === 0) {
      return res.status(404).json({ error: "No products found for the specified productName" });
    }

    // Return the products
    res.json(products);
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});


// Endpoint to update a product by productId
app.put("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params; // Extract productId from the URL
    const updateData = req.body; // Extract update data from the request body

    // Validate productId
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    // Find the product by productId and update it
    const updatedProduct = await Product.findOneAndUpdate(
      { productId }, // Query to find the product by productId
      updateData, // Update the product with the provided data
      { new: true } // Return the updated document
    );

    // If the product is not found, return a 404 error
    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return the updated product
    res.json(updatedProduct);
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});

// Delete a product
// Endpoint to delete a product by productId
app.delete("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params; // Extract productId from the URL

    // Validate productId
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    // Find and delete the product by productId
    const deletedProduct = await Product.findOneAndDelete({ productId });

    // If the product is not found, return a 404 error
    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return a success message
    res.json({ message: "Product deleted successfully", product: deletedProduct });
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});


// Endpoint to create a shop
app.post("/shops", upload.single("image"), async (req, res) => {
  try {
    // Log the request body and file
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    // Extract fields from the request body
    const { title, location, ownerName, items } = req.body;

    // Create a new shop
    const newShop = new Shop({
      title,
      location,
      ownerName,
      items: JSON.parse(items), // Parse the items array from the request body
      image: req.file ? req.file.buffer : null, // Store image as binary data
    });

    // Save the shop to the database
    await newShop.save();

    // Send the response
    res.status(201).json({ message: "Shop created successfully", shop: newShop });
  } catch (err) {
    console.error("Error:", err); // Log the error
    res.status(500).json({ error: err.message });
  }
});

// Get all shops
app.get("/shops", async (req, res) => {
  try {
    const shops = await Shop.find();
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a shop by ID
app.get("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a shop by ID
app.put("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a shop by ID
app.delete("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json({ message: "Shop deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------- MARKET PRICE ENDPOINTS ----------------------- */

// Create a market price record
app.post("/marketprices", async (req, res) => {
  try {
    const marketPrice = new MarketPrice(req.body);
    await marketPrice.save();
    res.status(201).json(marketPrice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all market price records
app.get("/marketprices", async (req, res) => {
  try {
    const marketPrices = await MarketPrice.find();
    res.json(marketPrices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a market price record by ID
app.get("/marketprices/:id", async (req, res) => {
  try {
    const marketPrice = await MarketPrice.findById(req.params.id);
    if (!marketPrice)
      return res.status(404).json({ error: "MarketPrice not found" });
    res.json(marketPrice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update a market price record by ID
app.put("/marketprices/:id", async (req, res) => {
  try {
    const marketPrice = await MarketPrice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!marketPrice)
      return res.status(404).json({ error: "MarketPrice not found" });
    res.json(marketPrice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a market price record by ID
app.delete("/marketprices/:id", async (req, res) => {
  try {
    const marketPrice = await MarketPrice.findByIdAndDelete(req.params.id);
    if (!marketPrice)
      return res.status(404).json({ error: "MarketPrice not found" });
    res.json({ message: "MarketPrice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------- TRAINING ENDPOINTS ----------------------- */

// Create a training record
app.post("/trainings", async (req, res) => {
  try {
    const training = new Training(req.body);
    await training.save();
    res.status(201).json(training);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all trainings
app.get("/trainings", async (req, res) => {
  try {
    const trainings = await Training.find();
    res.json(trainings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training record based on name
app.get("/trainings/:name", async (req, res) => {
  try {
    const training = await Training.findOne({ name: req.params.name });
    if (!training)
      return res.status(404).json({ error: "Training record not found" });

    res.json(training);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update a training record by ID
app.put("/trainings/:id", async (req, res) => {
  try {
    const training = await Training.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!training)
      return res.status(404).json({ error: "Training not found" });
    res.json(training);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a training record by ID
app.delete("/trainings/:id", async (req, res) => {
  try {
    const training = await Training.findByIdAndDelete(req.params.id);
    if (!training)
      return res.status(404).json({ error: "Training not found" });
    res.json({ message: "Training deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});










app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});