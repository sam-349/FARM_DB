// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

// Import models
const { User, Blog, Product, Shop, MarketPrice, Training, Cart } = require("./models/models");

const app = express();
const port = 3000;
const dbUrl = "mongodb+srv://admin:admin123@cluster0.xnhgc.mongodb.net/farm_db?retryWrites=true&w=majority&appName=Cluster0";
const secretKey = "your_jwt_secret";

mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware to parse JSON bodies
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token.split(" ")[1], secretKey, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token." });
    req.user = user;
    next();
  });
};



// Signup endpoint: Creates a new user
app.post("/signup", upload.single("pic"), async (req, res) => {
  console.log("signup called wit body " + req.body.type);
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
    console.log("login called with body: " + req.body.mail + " " + req.body.password);
    const { mail, password } = req.body;
    const user = await User.findOne({ mail });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // const token = jwt.sign({ userId: user._id, email: user.email }, secretKey, { expiresIn: "1h" });
    // res.json({ token });
    res.json({ message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/farmers", async (req, res) => {
  try {
    const farmers = await User.find({ type: "farmer" });
    res.status(200).json(farmers);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving farmers", error });
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
    console.log("error while posting blog: " + err);
    res.status(500).json({ error: err.message });
  }
});

// GET blogs by category
app.get("/blogs", async (req, res) => {
  try {
    const { category } = req.query;

    // Define excluded categories
    const excludedCategories = ["wheat", "paddy", "fruits", "vegetables"];

    let blogs;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    if (category === "other") {
      // Fetch blogs that do NOT belong to excluded categories
      blogs = await Blog.find({ category: { $nin: excludedCategories } }).populate("userId", "username");
    } else {
      // Fetch blogs for the given category
      blogs = await Blog.find({ category }).populate("userId", "username");
    }

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


// get all blogs
app.get("/blogs/all", async (req, res) => {
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
    const blogs = await Blog.find({ title: { $regex: req.params.title, $options: "i" } }).populate("userId", "username");
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
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    const { userId, productName, productType, price, quantity } = req.body;

    const newProduct = new Product({
      userId,
      productName,
      productType,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      image: req.file ? req.file.buffer : null,
    });

    await newProduct.save();

    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (err) {
    console.error("Error:", err);
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

// Get product by ID (MongoDB's _id)
app.get("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to retrieve products by productName
app.get("/products", async (req, res) => {
  try {
    const { productName } = req.query;

    if (!productName) {
      return res.status(400).json({ error: "productName is required" });
    }

    const products = await Product.find({ productName: { $regex: productName, $options: "i" } });

    if (products.length === 0) {
      return res.status(404).json({ error: "No products found for the specified productName" });
    }

    res.json(products);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to update a product by ID (MongoDB's _id)
app.put("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a product by ID (MongoDB's _id)
app.delete("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully", product: deletedProduct });
  } catch (err) {
    console.error("Error:", err);
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

//get cart items
app.get('/cart/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate if userId is a valid ObjectId (optional, but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    // Find cart items for the given user and populate product details
    const cartItems = await Cart.find({ user_id: userId })
      .populate({
        path: 'productid', // Populate the 'productid' field with Product documents
        populate: { // Nested population within 'productid'
          path: 'userId',  // Populate 'userId' field within the Product document
          select: '-password' // Optionally exclude password from populated User
        }
      })
      .exec();

    if (!cartItems || cartItems.length === 0) {
      return res.status(200).json({ message: 'Cart is empty for this user', cartItems: [] }); // Or you can send 404 if you consider empty cart as not found
    }

    res.status(200).json({ cartItems });

  } catch (error) {
    console.error('Error retrieving cart items:', error);
    res.status(500).json({ message: 'Failed to retrieve cart items', error: error.message });
  }
});


// POST endpoint to add items to user cart
app.post('/cart', async (req, res) => {
  try {
    const { productId, user_id, qty } = req.body; // Use productId from request body
    console.log(productId + " " + user_id + " " + qty);

    // Validate required fields
    if (!productId || !user_id || !qty) { // Use productId for validation
      return res.status(400).json({ message: 'Missing required fields: productId, user_id, qty' }); // Use productId in message
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) { // Only user_id needs to be ObjectId in CartSchema
      return res.status(400).json({ message: 'Invalid user_id' }); // Validation for user_id ObjectId
    }

    if (qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    // Check if product and user exist (optional, but recommended for data integrity)
    // Use Product.findOne with productId (String field in ProductSchema)
    const productExists = await Product.findById(productId);
    const userExists = await User.findById(user_id);

    if (!productExists) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }


    // Check if item already exists in the cart for this user and product
    // Use productExists._id (ObjectId of Product document) for productid in Cart query
    let cartItem = await Cart.findOne({ user_id: user_id, productid: productExists._id });

    if (cartItem) {
      // If item exists, update the quantity
      cartItem.qty += qty;
      await cartItem.save();
    } else {
      // If item doesn't exist, create a new cart item
      // product_name is available in productExists.productName
      const newCartItem = new Cart({
        product_name: productExists.productName,
        productid: productExists._id, // Use productExists._id (ObjectId)
        user_id: user_id,
        qty: qty,
      });
      await newCartItem.save();
      cartItem = newCartItem; // For response consistency
    }

    res.status(201).json({ message: 'Item added to cart successfully', cartItem: cartItem });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Failed to add item to cart', error: error.message });
  }
});


// DELETE endpoint to remove an item from user cart by cartItemId
app.delete('/cart/:cartItemId', async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      return res.status(400).json({ message: 'Invalid cartItemId' });
    }

    const deletedCartItem = await Cart.findByIdAndDelete(cartItemId);

    if (!deletedCartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.status(200).json({ message: 'Item removed from cart successfully', deletedCartItem: deletedCartItem });

  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Failed to remove item from cart', error: error.message });
  }
});


// PUT endpoint to update quantity of an item in the user cart (increment/decrement)
app.put('/cart/:cartItemId', async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;
    const action = req.query.action; // Get action from query parameter (e.g., ?action=increment or ?action=decrement)

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      return res.status(400).json({ message: 'Invalid cartItemId' });
    }

    if (!action || (action !== 'increment' && action !== 'decrement')) {
      return res.status(400).json({ message: 'Invalid action. Action must be "increment" or "decrement".' });
    }

    const cartItem = await Cart.findById(cartItemId);

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    if (action === 'increment') {
      cartItem.qty += 1;
    } else if (action === 'decrement') {
      cartItem.qty -= 1;
    }

    if (cartItem.qty <= 0 && action === 'decrement') { // Only delete if decrementing leads to zero or less
      await Cart.findByIdAndDelete(cartItemId);
      return res.status(200).json({ message: "Item can't be removed", cartItemId: cartItemId });
    } else {
      const updated = await Cart.findByIdAndUpdate(cartItemId, cartItem, { new: true });
      return res.status(200).json({ message: `Cart item quantity ${action}ed successfully`, cartItem: updated });
    }

  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    res.status(500).json({ message: 'Failed to update cart item quantity', error: error.message });
  }
});

// ---user CRUD-----
app.post("/users", upload.single("pic"), async (req, res) => {
  try {
    const { username, mail, password, phonenumber, location, type } = req.body;
    const pic = req.file ? req.file.buffer : undefined;

    const newUser = new User({ username, mail, password, phonenumber, location, pic, type });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User by ID
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User
app.put("/users/:id", upload.single("pic"), async (req, res) => {
  try {
    const { username, mail, password, phonenumber, location, type } = req.body;
    const pic = req.file ? req.file.buffer : undefined;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, mail, password, phonenumber, location, pic, type },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete User
app.delete("/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//------------------MISC-----------------
//get blogs by product Id
app.get("/products/user/:userId", async (req, res) => {
  try {
    const products = await Product.find({ userId: req.params.userId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get blogs by user Id
app.get("/blogs/user/:userId", async (req, res) => {
  try {
    const blogs = await Blog.find({ userId: req.params.userId }).populate("userId", "username");
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});