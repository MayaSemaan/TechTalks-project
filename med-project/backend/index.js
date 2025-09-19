require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/medapp';

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error(err));

// import routes
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportsRoutes);

app.listen(PORT, () => console.log('Server listening on ${PORT}'));