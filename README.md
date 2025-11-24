# FoundIt

**FoundIt** is a lost-and-found app designed specifically for Hunter College students and staff. It provides a simple platform to report lost and found items, helping users quickly recover their belongings without relying on posters or word-of-mouth.

---

## 🌐 Visit The Site

Check out the live project here: [FoundIt](https://founditapp.netlify.app)

<img width="1435" height="811" alt="Screenshot 2025-11-24 at 12 00 06 PM" src="https://github.com/user-attachments/assets/48908a7e-5f03-45f2-8088-2644a4e41a15" />

---

## 🔑 Key Features

- **Google Login**  
  Quick and secure login with Google Sign-In.

- **Create a Post**  
  Create a post with text and an optional photo to describe lost or found items.

- **Feed with Filters**  
  View posts with filters: all items, lost items, found items.

- **Search Bar**  
  Find specific posts by keyword.

- **Post Management**  
  Option to delete or mark posts as resolved once items are recovered.

---

## 📁 Tech Stack

- **Frontend**: React.js
- **Backend**: Firebase (Firestore for database, Firebase Storage for images)
- **Authentication**: Google Sign-In
- **Deployment**: Netlify (for hosting)

---

## ✅ Prerequisites

Before you begin, ensure you have the following:

- **Node.js v14+**
- **Firebase Project** (for Firestore and Authentication)
- **Google Sign-In API** enabled in Firebase

---

## 🔌 API Endpoints

These are key routes used in the app:

- `POST /api/posts`  
  Create a new post (lost or found item).

- `GET /api/posts`  
  Get all posts or filter by lost/found status.

- `DELETE /api/posts/:id`  
  Delete a post (admin or post owner only).

---

## 🛠️ Installation

```bash
# 1. Clone and enter the project
git clone https://github.com/mahimali937/FoundIt.git
cd FoundIt

# 2. Install dependencies
npm install

# 3. Setup Firebase
- Create a Firebase project and enable Firestore & Firebase Storage.
- Setup Google Authentication.

# 4. Run the app
npm start