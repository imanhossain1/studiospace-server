import { createRemoteJWKSet, jwtVerify } from "jose";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

// 1. Express App
const app = express();
const port = process.env.PORT || 8000;

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. MongoDB Connection
const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`
);

await client.connect();

console.log("Successfully Connected to MongoDB");

const db = client.db("studioSpace");
const studiosCollection = db.collection("studios");
const bookingsCollection = db.collection("bookings");


// ========================================
// 4. JWT Verify Middleware
// ========================================

// Better Auth JWKS URL
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  // Client থেকে পাঠানো Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({
      message: "Token not found",
    });
  }

  // Bearer token থেকে শুধু JWT অংশ নেওয়া
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      message: "Invalid token format",
    });
  }

  try {
    // JWT signature verify করা
    const { payload } = await jwtVerify(token, JWKS);

    // Verified user information রাখা
    req.user = payload;


    next();
  } catch (error) {
    console.log("JWT Verify Error:", error.message);

    return res.status(401).send({
      message: "Invalid or expired token",
    });
  }
};


// ========================================
// 5. Home Route
// ========================================

app.get("/", (req, res) => {
  res.send("StudioSpace Server is Running");
});


// ========================================
// 6. Get All Studios / Category Wise Studios
// Public API
// ========================================

app.get("/studios", async (req, res) => {
  const category = req.query.category;

  const query = category ? { category } : {};

  const result = await studiosCollection.find(query).toArray();

  res.send(result);
});


// ========================================
// 7. Get Categories
// Public API
// ========================================

app.get("/categories", async (req, res) => {
  const categories = await studiosCollection.distinct("category");

  res.send(categories);
});


// ========================================
// 8. Get Featured Studios
// Public API
// ========================================

app.get("/studios/featured", async (req, res) => {
  const result = await studiosCollection
    .find({})
    .sort({ rating: -1 })
    .limit(6)
    .toArray();

  res.send(result);
});


// ========================================
// 9. Get Single Studio
// Public API
// ========================================

app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid Studio ID",
    });
  }

  const result = await studiosCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!result) {
    return res.status(404).send({
      message: "Studio not found",
    });
  }

  res.send(result);
});


// ========================================
// 10. Get My Studio Listings
// Protected API
// ========================================

app.get("/my-listings", verifyToken, async (req, res) => {
  const email = req.user.email;

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  const result = await studiosCollection
    .find({ userEmail: email })
    .toArray();

  res.send(result);
});


// ========================================
// 11. Add New Studio
// Protected API
// ========================================

app.post("/studios", verifyToken, async (req, res) => {
  const newStudio = req.body;

  const email = req.user.email;

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  // Client-এর email বিশ্বাস না করে JWT থেকে email নেওয়া
  const studioData = {
    ...newStudio,
    userEmail: email,
    createdAt: new Date(),
  };

  const result = await studiosCollection.insertOne(studioData);

  res.send(result);
});


// ========================================
// 12. Update Studio
// Protected API
// ========================================

app.patch("/studios/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const email = req.user.email;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid Studio ID",
    });
  }

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  const updatedStudio = req.body;

  const result = await studiosCollection.updateOne(
    {
      _id: new ObjectId(id),
      userEmail: email,
    },
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

  if (result.matchedCount === 0) {
    return res.status(404).send({
      message: "Studio not found or you are not the owner",
    });
  }

  res.send(result);
});


// ========================================
// 13. Delete Studio
// Protected API
// ========================================

app.delete("/studios/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const email = req.user.email;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid Studio ID",
    });
  }

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  const result = await studiosCollection.deleteOne({
    _id: new ObjectId(id),
    userEmail: email,
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({
      message: "Studio not found or you are not the owner",
    });
  }

  res.send(result);
});


// ========================================
// 14. Create Booking
// Protected API
// ========================================

app.post("/bookings", verifyToken, async (req, res) => {
  const newBooking = req.body;
  const email = req.user.email;

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  // Verified user-এর email এবং Pending status server set করবে
  const bookingData = {
    ...newBooking,
    userEmail: email,
    status: "Pending",
    createdAt: new Date(),
  };

  const result = await bookingsCollection.insertOne(bookingData);

  res.send(result);
});


// ========================================
// 15. Get My Bookings
// Protected API
// ========================================

app.get("/my-bookings", verifyToken, async (req, res) => {
  const email = req.user.email;

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  const result = await bookingsCollection
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});


// ========================================
// 16. Cancel Booking
// Protected API
// ========================================

app.patch("/bookings/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const email = req.user.email;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid Booking ID",
    });
  }

  if (!email) {
    return res.status(401).send({
      message: "Email not found in JWT payload",
    });
  }

  // শুধু নিজের Pending booking খুঁজবে
  const booking = await bookingsCollection.findOne({
    _id: new ObjectId(id),
    userEmail: email,
  });

  if (!booking) {
    return res.status(404).send({
      message: "Booking not found or you are not the owner",
    });
  }

  if (booking.status !== "Pending") {
    return res.status(400).send({
      message: "Only pending bookings can be cancelled",
    });
  }

  const result = await bookingsCollection.updateOne(
    {
      _id: new ObjectId(id),
      userEmail: email,
      status: "Pending",
    },
    {
      $set: {
        status: "Cancelled",
      },
    }
  );

  res.send(result);
});


// ========================================
// 17. Server Listen
// ========================================

app.listen(port, () => {
  console.log(`StudioSpace Server Running on Port: ${port}`);
});

export default app;
