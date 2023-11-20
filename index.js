const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
// // This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware part
app.use(cors());
app.use(express.json());

// Connecting with MongoDB Driver
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7cekihd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Get the database and collection on which to run the operation
    // jwt related Api (JWT)
    // post
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    //Used Middleware :  Verified Token
    const verifiedToken = (req, res, next) => {
      // console.log("inside verified token:", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // nicher ongshota na korle oo chole
      // if (!token) {
      //   return res.status(401).send({message: 'forbidden access'})
      // }
      // next();
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // used verifiedAdmin after verifiedToken
    const verifiedAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userDatabase.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // user collection & user database section
    // user collection create
    const userDatabase = client.db("bistroDB").collection("userCollection");
    // post
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert user email if user email doesn't  exists
      // this process can do in many ways ( such as : unique email id, upsert, simple check)
      const query = { email: user.email };
      const existingUser = await userDatabase.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userDatabase.insertOne(user);
      res.send(result);
    });

    // get users
    app.get("/users", verifiedToken, verifiedAdmin, async (req, res) => {
      const result = await userDatabase.find().toArray();
      res.send(result);
    });
    // make admin
    app.patch(
      "/users/admin/:id",
      verifiedToken,
      verifiedAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = {
          _id: new ObjectId(id),
        };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userDatabase.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.get("/users/admin/:email", verifiedToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userDatabase.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // users delete operation
    app.delete("/users/:id", verifiedToken, verifiedAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await userDatabase.deleteOne(query);
      res.send(result);
    });
    // get menu items
    // collection create
    const menuDatabase = client.db("bistroDB").collection("menuCollection");
    app.get("/menu", async (req, res) => {
      const result = await menuDatabase.find().toArray();
      res.send(result);
    });
    // app.get() => for a specific (id) to update a items
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuDatabase.findOne(query);
      res.send(result);
    });
    // app.patch() for updated something
    app.patch("/menu/:id", verifiedToken, verifiedAdmin, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image,
        },
      };
      const result = await menuDatabase.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // post menu item api create
    app.post("/menu", verifiedToken, verifiedAdmin, async (req, res) => {
      const addItemsIndatabase = req.body;
      const result = await menuDatabase.insertOne(addItemsIndatabase);
      res.send(result);
    });
    // menu delete api create
    app.delete("/menu/:id", verifiedToken, verifiedAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await menuDatabase.deleteOne(query);
      res.send(result);
    });

    // get reviews from database
    // collection create
    const reviewsDatabase = client
      .db("bistroDB")
      .collection("reviewsCollection");
    app.get("/reviews", async (req, res) => {
      const result = await reviewsDatabase.find().toArray();
      res.send(result);
    });
    //  ADD tO Cart section connect with database
    // collection create
    const addToCartDatabase = client
      .db("bistroDB")
      .collection("addToCartCollection");
    // post
    app.post("/carts", async (req, res) => {
      const cartItems = req.body;
      const result = await addToCartDatabase.insertOne(cartItems);
      res.send(result);
    });
    // get
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await addToCartDatabase.find(query).toArray();
      res.send(result);
    });
    // delete
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addToCartDatabase.deleteOne(query);
      res.send(result);
    });

    // create payment collection first
    const paymentDatabase = client
      .db("bistroDB")
      .collection("paymentCollection");

    // GET ***METHOD*** PAYMENTS
    app.get("/payments/:email", verifiedToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentDatabase.find(query).toArray();
      res.send(result);
    });
    // make payment calculate api  // ***POST METHOD***
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentDatabase.insertOne(payment);

      // carefully delete each item form cart
      // console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cartId.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await addToCartDatabase.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    // create payment intent api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // states // make revenue // analytics api create
    app.get("/admin-states", async (req, res) => {
      const users = await userDatabase.estimatedDocumentCount();
      const menuItems = await menuDatabase.estimatedDocumentCount();
      const ordersItems = await paymentDatabase.estimatedDocumentCount();
      //  revenue bangla system
      // const payments = await paymentDatabase.find().toArray()
      // const revenue = payments.reduce( (total, payment) => total + payment.price, 0)
      //  now the best way revenue
      const result =  await paymentDatabase.aggregate([
        {
          
        }
      ])
      res.send({
        users,
        menuItems,
        ordersItems,
       
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// connect database confirmation
app.get("/", (req, res) => {
  res.send("Bistro Boss Server is OnWay");
});

app.listen(port, () => {
  console.log(`Bistro Boss Server Is Running On Port ${port}`);
});
