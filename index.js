require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const medicineRouter = require('./routes/medicine.route');

const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');

    app.use(express.json());
    app.use('/api', medicineRouter); // Use correct router

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on https://mern-med11co.onrender.com or http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });
