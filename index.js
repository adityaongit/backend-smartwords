const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const upload = require("express-fileupload");


const userRoutes = require("./routes/userRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const {
    notFound,
    handleErrorMiddleware,
} = require("./middlewares/errorMiddlewares.js");


const server = express();


main().catch((err) => console.log(err));

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database connected");
}

// Define CORS options
// const allowedOrigins = ["*"];
// const corsOptions = {
//     origin: function (origin, callback) {
//         if (!origin || allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     },
//     credentials: true,
// };

const corsOptions = {
    origin: function (origin, callback) {
        callback(null, true); // Allow all origins for development
    },
    credentials: true,
};


// Middleware setup

server.use(express.static(path.resolve(__dirname, "dist")));
server.use(express.json({ extended: true }));
server.use(express.urlencoded({ extended: true }));
server.use(cors(corsOptions));
server.use(upload());
server.use("/uploads", express.static(__dirname + "/uploads"));

// Define routes
server.use("/api/users", userRoutes);
server.use("/api/posts", postRoutes);

// Homepage route
server.use("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// Error handling middleware
server.use(notFound);
server.use(handleErrorMiddleware);

// Start server
server.listen(process.env.PORT, () => {
    console.log("Server running");
});
