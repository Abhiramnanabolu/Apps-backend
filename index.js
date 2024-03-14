const express = require("express");
const uuid = require("uuid")
const path = require("path");
const cors = require("cors")
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(cors())
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "EC-DB.db");
const dbPath2 = path.join(__dirname, "EC-DB2.db");
const EPDBPath = path.join(__dirname, "Edp.db");
const Port=process.env.PORT || 8080
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,// ec-1
    });
    db2 = await open({
      filename: dbPath2,
      driver: sqlite3.Database,//ec-2
    });
    EPDB=await open({
      filename : EPDBPath,
      driver: sqlite3.Database,// ep-1
    });
    app.listen(Port, () => {
      console.log(`Server Running at http://localhost:${Port}/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
app.use(express.json());

app.get("/", async (req,res)=>{
  res.send("Its Working")
})

app.get("/ec/users", async (request, response) => {
    
    const getBookQuery = `
      SELECT
        *
      FROM
        user_address`;
    const book = await db.all(getBookQuery);
    response.send(book);
});

app.get("/ec/product", async (request, response) => {
    
    const getBookQuery = `
      SELECT
        *
      FROM
        products
      WHERE
        productId="1"`;
    const book = await db.get(getBookQuery);
    response.send(book);
});
  
app.post("/ec/user/post", async (request, response) => {
    try {
      const { name, email, password } = request.body;
  
      // Validate required fields
      if (!name || !email || !password) {
        return response.status(400).json({ error: "Missing required fields." });
      }
  
      const insertUserQuery = `
        INSERT INTO users (user_id, name, email, password)
        VALUES (?, ?, ?, ?)
      `;
  
      const userId = uuid.v4(); // Generating a unique user_id using uuid
  
      await db.run(insertUserQuery, [userId, name, email, password]);
  
      // Create a JWT token
      const token = jwt.sign({ user_id: userId, name, email }, "your-secret-key", {
        expiresIn: "1h", // Token expiration time (adjust as needed)
      });
  
      response.status(201).json({
        user_id: userId,
        name,
        email,
        token, // Include the JWT token in the response
      });
    } catch (error) {
      console.error("Error adding user:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/ec/user/login", async (request, response) => {
    try {
      const { email, password } = request.body;
  
      // Validate required fields
      if (!email || !password) {
        return response.status(400).json({ error: "Missing required fields." });
      }
  
      const getUserQuery = `
        SELECT *
        FROM users
        WHERE email = ? AND password = ?
      `;
  
      const user = await db.get(getUserQuery, [email, password]);
  
      if (!user) {
        return response.status(401).json({ error: "Invalid email or password." });
      }
  
      // Create a JWT token
      const token = jwt.sign({ user_id: user.user_id, name: user.name, email: user.email }, "your-secret-key", {
        expiresIn: "1h", // Token expiration time (adjust as needed)
      });
  
      response.status(200).json({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        token, // Include the JWT token in the response
      });
    } catch (error) {
      console.error("Error during login:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/ec/user/:userId", async (request, response) => {
    try {
      const { userId } = request.params;
  
      const getUserQuery = `
        SELECT user_id, name, email
        FROM users
        WHERE user_id = ?;
      `;
  
      const user = await db.get(getUserQuery, [userId]);
  
      if (user) {
        response.status(200).json(user);
      } else {
        response.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user details:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/ec/user/address/:userId", async (request, response) => {
    try {
      const { userId } = request.params;
  
      const getUserAddressQuery = `
        SELECT * FROM user_address
        WHERE user_id = ?;
      `;
  
      const userAddress = await db.all(getUserAddressQuery, [userId]);
  
      if (userAddress && userAddress.length > 0) {
        response.status(200).json(userAddress);
      } else {
        response.status(404).json({ error: "User address not found" });
      }
    } catch (error) {
      console.error("Error fetching user address:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/ec/user/address/add", async (request, response) => {
    try {
      const { user_id, address } = request.body;
  
      const updateAddressQuery = `
        UPDATE user_address
        SET address = ?,
            is_given = 1
        WHERE user_id = ?;
      `;
  
      await db.run(updateAddressQuery, [address, user_id]);
  
      response.status(200).json({ message: "Address updated successfully" });
    } catch (error) {
      console.error("Error updating address:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/ec/products/:category", async (request, response) => {
    try {
      const { category } = request.params;
  
      const getProductsQuery = `
        SELECT * FROM products
        WHERE category LIKE ?;
      `;
  
      const products = await db.all(getProductsQuery, [`%${category}%`]);
  
      response.status(200).json(products);
    } catch (error) {
      console.error("Error fetching products:", error.message);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });
  
app.get("/ec/subcategories/:category", async (request, response) => {
  try {
    let { category } = request.params;

    // Remove double quotes if present
    category = category.replace(/"/g, '');

    const getSubcategoriesQuery = `
      SELECT DISTINCT subcategory FROM products
      WHERE category = ? OR category = ?;
    `;

    const subcategories = await db.all(getSubcategoriesQuery, [category, `"${category}"`]);

    response.status(200).json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//products when category and subcategory are provided in the request body
app.post("/ec/products", async (request, response) => {
  try {
    const { category, subcategory } = request.body;

    const cleanCategory = category.replace(/"/g, '');
    const cleanSubcategory = subcategory.replace(/"/g, ''); 

    const getProductsQuery = `
      SELECT * FROM products
      WHERE category LIKE ? AND subcategory LIKE ?;
    `;

    const queryParams = [`%${cleanCategory}%`, `%${cleanSubcategory}%`];

    const products = await db.all(getProductsQuery, queryParams);

    response.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//to add or change the address of the user
app.post("/ec/add-address", async (request, response) => {
  try {
    const { user_id, address } = request.body;

    const updateAddressQuery = `
      UPDATE user_address
      SET address = ?, is_given = 1
      WHERE user_id = ?;
    `;

    await db.run(updateAddressQuery, [address, user_id]);

    response.status(200).json({ message: "Address updated successfully." });
  } catch (error) {
    console.error("Error updating address:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//to add a product to a cart (NOT BEING USED)
app.post("/ec/cart/add-item", async (request, response) => {
  try {
    const { userId, productId, quantity,price } = request.body;

    const addToCartQuery = `
      INSERT INTO cart (user_id, product_id, quantity,price)
      VALUES (?, ?, ?, ?);
    `;

    const queryParams = [userId, productId, quantity,price];

    await db2.run(addToCartQuery, queryParams);

    response.status(200).json({ message: 'Product added to cart successfully' });
  } catch (error) {
    console.error("Error adding product to cart:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//to add a product to a cart (updated) it even checks if same product is in the cart updates it if present
app.post("/ec/cart/add", async (request, response) => {
  try {
    const { userId, productId, quantity, price } = request.body;

    // Check if the cart item already exists
    const checkCartItemQuery = `
      SELECT * FROM cart
      WHERE user_id = ? AND product_id = ?;
    `;

    const checkCartItem = await db2.get(checkCartItemQuery, [userId, productId]);

    if (checkCartItem) {
      // If the cart item exists, update the quantity and price
      const updateQuantityAndPriceQuery = `
        UPDATE cart
        SET quantity = ?, price = ?
        WHERE user_id = ? AND product_id = ?;
      `;

      const updateParams = [quantity, price, userId, productId];
      await db2.run(updateQuantityAndPriceQuery, updateParams);

      response.status(200).json({ message: 'Item quantity and price updated in cart successfully' });
    } else {
      // If the cart item doesn't exist, insert a new row
      const insertCartItemQuery = `
        INSERT INTO cart (user_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?);
      `;

      const insertParams = [userId, productId, quantity, price];
      await db2.run(insertCartItemQuery, insertParams);

      response.status(201).json({ message: 'Item added to cart successfully' });
    }
  } catch (error) {
    console.error("Error adding item to cart:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//to change the quantity of a product in the cart
app.put("/ec/cart/update-quantity", async (request, response) => {
  try {
    const { userId, productId, newQuantity } = request.body;

    const updateQuantityQuery = `
      UPDATE cart
      SET quantity = ?
      WHERE user_id = ? AND product_id = ?;
    `;

    const queryParams = [newQuantity, userId, productId];

    await db2.run(updateQuantityQuery, queryParams);

    response.status(200).json({ message: 'Quantity updated in cart successfully' });
  } catch (error) {
    console.error("Error updating quantity in cart:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//removing a product from the cart
app.delete("/ec/cart/remove", async (request, response) => {
  try {
    const { userId, productId } = request.body;

    const removeFromCartQuery = `
      DELETE FROM cart
      WHERE user_id = ? AND product_id = ?;
    `;

    const queryParams = [userId, productId];

    await db2.run(removeFromCartQuery, queryParams);

    response.status(200).json({ message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error("Error removing product from cart:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//to get all the products in the cart of a user
app.post("/ec/cart/products", async (request, response) => {
  try {
    const { userId } = request.body;

    const getCartProductsQuery = `
      SELECT * FROM cart
      WHERE user_id = ?;
    `;

    const cartProducts = await db2.all(getCartProductsQuery, [userId]);

    response.status(200).json(cartProducts);
  } catch (error) {
    console.error("Error fetching cart products:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});
//get details of a product with its id (used in the Your Cart Section)
app.get("/ec/product/:productId", async (request, response) => {
  try {
    const { productId } = request.params;

    const getProductDetailsQuery = `
      SELECT * FROM products
      WHERE productId = ?;
    `;

    const productDetails = await db.get(getProductDetailsQuery, [productId]);

    if (productDetails) {
      response.status(200).json(productDetails);
    } else {
      response.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error("Error fetching product details:", error.message);
    response.status(500).json({ error: "Internal Server Error" });
  }
});




///////// Education Portal

 
app.post("/ep/faculty/post", async (req, res) => {
  try {
    const { name, email, password} = req.body;
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const insertUserQuery = `
      INSERT INTO faculty (faculty_id, name, password, email)
      VALUES (?, ?, ?, ?)
    `;

    const userId = uuid.v4(); // Generating a unique UserID using uuid

    await EPDB.run(insertUserQuery, [userId, name, password, email]);

    // Create a JWT token
    const token = jwt.sign({ faculty_id: userId, name, email }, "your-secret-key", {
      expiresIn: "1h", // Token expiration time (adjust as needed)
    });

    res.status(201).json({
      faculty_id: userId,
      name,
      email,
      token, // Include the JWT token in the response
    });
  } catch (error) {
    console.error("Error adding user:", error.message);
    res.status(500).json({ error: "Internal Server Error","Error adding user": error.message });
  }
});

// Login for faculty and student
app.post('/ep/faculty/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const getUserQuery = `
      SELECT faculty_id, name, email,password
      FROM faculty
      WHERE email = ?
    `;

    const user = await EPDB.get(getUserQuery, [email]);

    // Check if the user exists and the password is correct
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email},
      'your-default-secret-key',
      { expiresIn: '1h' }
    );

    res.json({
      faculty_id: user.faculty_id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: { message: 'Internal Server Error', details: error.message } });
  }
});

app.get('/ep/faculty/:facultyId/classes', async (req, res) => {
  try {
    const facultyId = req.params.facultyId;
    const getClassesQuery = `
      SELECT *
      FROM classes
      WHERE faculty_id = ?;
    `;

    const classes = await EPDB.all(getClassesQuery, [facultyId]);
      res.status(200).json(classes);
      
  } catch (error) {
    console.error('Error fetching classes:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/ep/faculty/class/:classid/students', async (req, res) => {
  try {
    const ClassId = parseInt(req.params.classid);

    const getStudentsQuery = `
    SELECT student.student_id, student.name, student.email, classes.class_description, classes.class_name
      FROM class_student
      JOIN student ON class_student.student_id = student.student_id
      JOIN classes ON class_student.class_id = classes.class_id
      WHERE class_student.class_id = ${ClassId};
    `;

    const students = await EPDB.all(getStudentsQuery);
    res.status(200).json(students);
      
  } catch (error) {
    console.error('Error fetching students:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/ep/faculty/class/:classId/info', async (req, res) => {
  try {
    const classId = req.params.classId;

    const getClassInfoQuery = `
      SELECT class_id, class_name, class_description, faculty_id
      FROM classes
      WHERE class_id = ?;
    `;

    const classInfo = await EPDB.get(getClassInfoQuery, [classId]);

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.status(200).json(classInfo);
  } catch (error) {
    console.error('Error fetching class information:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/ep/faculty/classes/add', async (req, res) => {
  try {
    const { class_name, class_description, faculty_id } = req.body;

    // Assuming faculty_id is provided in the request body
    if (!class_name || !faculty_id || !class_description) {
        return res.status(400).json({ error: 'class_name and faculty_id are required in the request body' });
    }

    const addClassQuery = `
      INSERT INTO classes (class_name, class_description, faculty_id)
      VALUES (?, ?, ?);
    `;

    await EPDB.run(addClassQuery, [class_name, class_description, faculty_id]);

    res.status(201).json({ message: 'Class added successfully' });
  } catch (error) {
    console.error('Error adding class:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
