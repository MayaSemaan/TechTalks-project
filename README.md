# Smart Medicine Reminder with Family Alerts (Web)

This is a **Next.js fullstack project** for managing medications, tracking patient adherence, sending notifications to family members, and managing doctor reports. It includes **backend APIs (Node.js + MongoDB)**, **frontend Next.js pages**, and **cron-based reminders**.

---

## Features

- **User Authentication**

  - Signup & Login
  - Roles: Patient, Family, Doctor

- **Medication Management**

  - CRUD: Add, edit, delete medications
  - Status tracking: Taken / Missed

- **Reminders & Notifications**

  - Automatic reminders via email
  - Alerts to family members if medication not taken
  - Cron job to check medication schedules

- **Dashboard**

  - Charts and tables for adherence
  - Doctor & family views of patients

- **Doctor Reports**

  - Upload, view, edit, and download reports
  - Notifications to patients and family

- **Search & Linking**

  - Search patients
  - Link patients with doctors/family

---

## Tech Stack

- **Frontend:** Next.js, React, Axios
- **Backend:** Node.js, Next.js API routes

- **Database:** MongoDB (Mongoose for schema modeling)

- **Cron Jobs:** Node.js Cron for reminders
- **Email Service:** Resend for notifications/reminders
- **Charts:** Recharts / Chart.js

---

## Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd <repo-name>
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file with:

```env
MONGODB_URI=your_mongodb_connection_string
ENABLE_CRON=true
MEDS_CRON_URL=http://localhost:3000/api/medications/cron
CRON_SERVICE_TOKEN=your_cron_service_token
RESEND_API_KEY=your_resend_api_key
JWT_SECRET=your_jwt_secret
```

4. **Seed database (optional)**

```bash
node seed.js
```

5. **Run development server**

```bash
npm run dev
```

---

## Notes

- **Session behavior:** Uses `localStorage`. Logging in as a different user in another tab will overwrite the session.
- **Notifications:** Ensure `RESEND_API_KEY` is valid to send email reminders.
- **Security:** Protect `JWT_SECRET` and `CRON_SERVICE_TOKEN` in production.
- **Database:** MongoDB URI should be configured in `.env`. Use a cluster or local instance.

---
