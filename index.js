
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const client = new MongoClient(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully Connected to MongoDB");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}

const connectedClient = await connectToMongoDB();

const db = connectedClient.db("studioSpace");
const studios = db.collection("studios");

// Home Route
app.get("/", (req, res) => {
  res.send("StudioSpace Server is Running");
});

// Get All Studios
app.get("/studios", async (req, res) => {
  const cursor = studios.find({});
  const allStudios = await cursor.toArray();
  res.send(allStudios);
});

// Get Featured Studios
app.get("/studios/featured", async (req, res) => {
  const featuredStudios = await studios
    .find({})
    .sort({ rating: -1 })
    .limit(6)
    .toArray();

  res.send(featuredStudios);
});

// Get Single Studio
app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const result = await studios.findOne(query);
  res.send(result);
});

// Add New Studio
app.post("/studios", async (req, res) => {
  const newStudio = req.body;

  const result = await studios.insertOne(newStudio);
  res.send(result);
});

// Update Studio
app.patch("/studios/:id", async (req, res) => {
  const id = req.params.id;
  const updatedStudio = req.body;

  const filter = {
    _id: new ObjectId(id)
  };

  const updateDoc = {
    $set: {
      title: updatedStudio.title,
      category: updatedStudio.category,
      hourlyRate: updatedStudio.hourlyRate,
      securityDeposit: updatedStudio.securityDeposit,
      maxCapacity: updatedStudio.maxCapacity,
      location: updatedStudio.location,
      image: updatedStudio.image,
      amenities: updatedStudio.amenities,
      overview: updatedStudio.overview
    }
  };

  const result = await studios.updateOne(filter, updateDoc);
  res.send(result);
});

// Delete Studio
app.delete("/studios/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const result = await studios.deleteOne(query);
  res.send(result);
});

// Server Listen
app.listen(port, () => {
  console.log(`StudioSpace Server is Running on Port: ${port}`);
});
