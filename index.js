
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`
);

await client.connect();

console.log("Successfully Connected to MongoDB");

const db = client.db("studioSpace");
const studios = db.collection("studios");

// Home Route
app.get("/", (req, res) => {
  res.send("StudioSpace Server is Running");
});

// Get All Studios or Category Wise Studios
app.get("/studios", async (req, res) => {
  const category = req.query.category;
  const query = category ? { category } : {};

  const result = await studios.find(query).toArray();

  res.send(result);
});

// Get Featured Studios
app.get("/studios/featured", async (req, res) => {
  const result = await studios
    .find({})
    .sort({ rating: -1 })
    .limit(6)
    .toArray();

  res.send(result);
});

// Get Single Studio
app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;

  const result = await studios.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// Get Categories for Category Navbar
app.get("/categories", async (req, res) => {
  const categories = await studios.distinct("category");

  res.send(categories);
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

  const result = await studios.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title: updatedStudio.title,
        category: updatedStudio.category,
        hourlyRate: updatedStudio.hourlyRate,
        securityDeposit: updatedStudio.securityDeposit,
        maxCapacity: updatedStudio.maxCapacity,
        location: updatedStudio.location,
        image: updatedStudio.image,
        amenities: updatedStudio.amenities,
        overview: updatedStudio.overview,
      },
    }
  );

  res.send(result);
});

// Delete Studio
app.delete("/studios/:id", async (req, res) => {
  const id = req.params.id;

  const result = await studios.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// Server Listen
app.listen(port, () => {
  console.log(`StudioSpace Server Running on Port: ${port}`);
});
