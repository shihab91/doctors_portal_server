const express = require('express')
const app = express();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const cors = require('cors')
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json())
// doctors-portal-adminsdk.json


const serviceAccount = require("./doctors-portal-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bvkvy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function verifyIdToken(req, res, next) {
  if (req?.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {
    }
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentCollection = await database.collection("appointments");
    const usersCollection = await database.collection("users")
    // get all the appointments from the database
    app.get("/appointments", verifyIdToken, async (req, res,) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      console.log(date);
      const query = { email: email, date: date }
      const cursor = appointmentCollection.find(query)
      const appointments = await cursor.toArray();
      res.json(appointments)
    })
    // post appointment to database 
    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      res.json(result)
    })
    // post user to database 
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result)
    });
    // get users from the database 
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      console.log(user);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    })
    // upSert a user
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email }
      const options = { upsert: true }; // if user does not exist, create a new one
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    })
    app.put("/users/admin", verifyIdToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester })
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: "you do not have to make admin" })
      }
    })
  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello Doctors Portal!')
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})