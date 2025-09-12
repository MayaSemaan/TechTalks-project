const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect('mongodb://localhost:27017/smart-meds', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Use dashboard route
app.use('/dashboard', dashboardRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log('Server running on port ${PORT}'));
