# Medication CRUD API

A simple **Node.js + Express + MongoDB (Mongoose)** backend for managing medications.  
This project implements full CRUD (Create, Read, Update, Delete) operations for a `Medication` model.

**Author:** Hussein El Mazbouh  
**Role:** Person B

---

## **Table of Contents**

- [Technologies](#technologies)  
- [Setup](#setup)  
- [Environment Variables](#environment-variables)  
- [Folder Structure](#folder-structure)  
- [API Endpoints](#api-endpoints)
- [CRUDs](#cruds)  
- [Testing](#testing)  

## **Technologies**

- Node.js  
- Express.js  
- MongoDB  
- Mongoose  
- dotenv  

## **Setup**

1. Clone the repository:
................................

2. Install dependencies(Terminal):

npm install

3. Create a `.env` file in the project root (see [Environment Variables](#environment-variables)).  

4. Start the server(Terminal):

node index.js

Server runs on `http://localhost:5000` (or the port defined in `.env`).

## **Environment Variables**

Create a `.env` file with the following content:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

- `MONGO_URI` → Your MongoDB connection string (local or Atlas).  
- `PORT` → Port your server will run on (default is 5000).  

---

## **Folder Structure**

models/
Medication.js       # Medication schema
routes/
medications.js      # CRUD routes
index.js                # Server setup
.env                    # Environment variables

---

## **API Endpoints**
## CRUDs

| Method | Endpoint               | Description                    |

| POST   | `/medications`         | Create a new medication        |
| GET    | `/medications`         | Get all medications            |
| GET    | `/medications/:id`     | Get a single medication by ID  |
| PUT    | `/medications/:id`     | Update a medication by ID      |
| DELETE | `/medications/:id`     | Delete a medication by ID      |

**Example POST Request Body:**

json
{
  "userId": "64fa1b5e9f1b3c0012345678",
  "name": "Paracetamol",
  "dosage": "500mg",
  "schedule": "8:00 AM",
  "status": "missed"
}

## **Testing**

1. Use **Postman** or ... .  
2. Test the CRUD operations using the endpoints above.  
3. Verify changes directly in **MongoDB Compass** or your MongoDB instance.  

---

## **Notes**

- All CRUD operations are **fully functional**.  
- `Medication` documents are connected to a `userId` (assume a User model exists).  
- This is a **backend-only project**, suitable for integrating with a frontend later.  
- **Author:** Hussein El Mazbouh  
- **Role:** Person B

////////////////////////////////////////////////////////////////////////////