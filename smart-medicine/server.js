const express = require('express'); 
const mongoose = require('mongoose'); 
const bodyParser = require('body-parser');
 const dashboardAPI = require('./routes/dashboard-api'); 
 const app = express(); 
 const PORT = 3000; 
 // Middleware
  app.use(bodyParser.json()); 
  //Routes
   app.use('/api', dashboardAPI); 
  // Connect to MongoD
   mongoose.connect('mongodb://127.0.0.1:27017/smart-medicine', {
     useNewUrlParser: true,
      useUnifiedTopology: true, }) .then(() => console.log('MongoDB connected')) .catch(err => console.log(err));
       app.listen(PORT, () => { console.log('Server running on http://localhost:${PORT}');

        }); 
