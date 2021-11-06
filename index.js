const express = require('express')
const app = express();
const { MongoClient } = require('mongodb');
const cors = require('cors')
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json())
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bvkvy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentCollection = await database.collection("appointments");
    app.get("/appointments", async (req, res,) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date }
      const cursor = appointmentCollection.find(query)
      const appointments = await cursor.toArray();
      res.json(appointments)
    })


    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      console.log(appointment);
      res.json(result)
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