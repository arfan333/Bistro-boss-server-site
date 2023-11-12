const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

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
    // get menu items 
    const menuDatabase = client.db("bistroDB").collection("menuCollection");
    app.get('/menu', async(req,res)=>{
      const result = await menuDatabase.find().toArray()
      res.send(result)
    })
    // get reviews from database
    const reviewsDatabase = client.db("bistroDB").collection("reviewsCollection");
    app.get('/reviews', async(req,res)=>{
      const result = await reviewsDatabase.find().toArray()
      res.send(result)
    })

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
