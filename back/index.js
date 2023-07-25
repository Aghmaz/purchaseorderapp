// backendApp.js
const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const upload = multer({ dest: "uploads/" });
const crypto = require("crypto");

function calculateFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,PATCH,DELETE",
    credentials: true,
  })
);
// Connect to MongoDB (Replace 'your_mongodb_connection_string' with your actual MongoDB connection string)
mongoose
  .connect("mongodb://0.0.0.0:27017/purchaseorderapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("connected to mongodb"))
  .catch((error) => console.log("couldn't connected to mongodb"));

// Define a Purchase Order schema
const purchaseOrderSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  vendorName: { type: String, required: true },
  modelNumber: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

let previousFileChecksum = null;
// ... (previous code)

app.post(
  "/api/submitpurchaseorder",
  upload.single("csvFile"),
  async (req, res) => {
    const { date, vendorName } = req.body;
    const csvFilePath = req.file.path;
    const errors = [];

    const currentFileChecksum = await calculateFileChecksum(csvFilePath);

    if (currentFileChecksum === previousFileChecksum) {
      return res.status(400).json({
        success: false,
        error: "Duplicate file. The same file has been uploaded before.",
      });
    }

    previousFileChecksum = currentFileChecksum;
    // Validate date and vendorName fields (you can add more validations if needed)
    if (!date) {
      errors.push("Date field is required.");
    }

    if (!vendorName) {
      errors.push("Vendor Name field is required.");
    }

    // Parse CSV file and validate its contents
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on("data", (row) => {
        const rowData = {
          date: row.Date, // Capitalized field name from CSV
          vendorName: row["Vendor Name"], // Capitalized field name from CSV
          modelNumber: row["Model Number"],
          unitPrice: parseFloat(row["Unit Price"]),
          quantity: parseInt(row.Quantity),
        };

        // Validate the required fields in the parsed data
        if (!rowData.date || !rowData.vendorName) {
          errors.push("Date and Vendor Name fields are required.");
        }

        if (!rowData.modelNumber || typeof rowData.modelNumber !== "string") {
          errors.push("Invalid Model Number in CSV file.");
        }

        if (isNaN(rowData.unitPrice)) {
          errors.push("Invalid Unit Price in CSV file.");
        }

        if (!Number.isInteger(rowData.quantity)) {
          errors.push("Invalid Quantity in CSV file.");
        }

        results.push(rowData);
      })
      .on("end", async () => {
        // Delete the temporary uploaded CSV file
        fs.unlinkSync(csvFilePath);

        if (errors.length > 0) {
          res.status(400).json({ success: false, error: errors.join(" ") });
        } else {
          // Debugging: Log the parsed results before saving
          console.log("Parsed results:", results);

          // Check if any of the records already exist in the database
          const existingOrders = await PurchaseOrder.find({
            $or: results.map((rowData) => ({
              modelNumber: rowData.modelNumber,
              vendorName: rowData.vendorName,
            })),
          });

          if (existingOrders.length > 0) {
            return res.status(402).json({
              success: false,
              error: "Data already exists in the database.",
            });
          }

          // Save valid purchase order data to MongoDB
          PurchaseOrder.insertMany(results, (err, savedOrders) => {
            if (err) {
              console.error("Error saving purchase orders:", err);
              return res.status(500).json({
                success: false,
                error: "Error saving purchase orders.",
              });
            }
            console.log(
              "Successfully saved purchase orders to MongoDB:",
              savedOrders
            );
            res.json({ success: true, data: savedOrders });
          });
        }
      });
  }
);

// ... (rest of the code)

app.listen(3001, () => {
  console.log("Backend server running on port 3001.");
});
