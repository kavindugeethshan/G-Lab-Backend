# G-Lab Backend

A modern RESTful backend and real-time API powering the G-Lab computer hardware e-commerce platform.

The backend is built with Node.js, Express.js, MongoDB, Socket.IO, PayHere payment integration, Firebase Storage, transactional email services, and Google Gemini AI.

The G-Lab frontend is maintained separately as a React application.

## Features

* User registration and email verification
* JWT-based authentication
* Password reset with OTP verification
* Role-based admin authorization
* Product catalog management
* Hardware product search and filtering
* Pagination and price sorting
* Shopping cart management
* Order management
* Order status tracking and history
* Inventory management
* Product reviews and ratings
* PayHere payment integration
* Firebase image storage
* Real-time updates using Socket.IO
* Transactional email notifications
* Google Gemini AI hardware assistant
* Admin dashboard and management APIs
* Rate limiting and server-side validation


## Tech Stack

### Runtime and Framework

* Node.js
* Express.js
* JavaScript / ES Modules

### Database

* MongoDB
* MongoDB Atlas
* Mongoose

### Authentication and Security

* JSON Web Tokens (JWT)
* bcrypt
* Helmet
* Express Rate Limit
* Authentication Middleware
* Admin Authorization Middleware
* Environment Variables
* Server-side Validation
* CORS

### Real-Time Communication

* Socket.IO

### Payment

* PayHere Payment Gateway
* PayHere Sandbox for development and testing

### Email

* Nodemailer
* SMTP / Gmail
* Resend API

### AI

* Google Gemini
* Google GenAI SDK

### Storage

* Firebase Storage

---

## Backend Architecture

```text
                    G-Lab Frontend
                          |
                          | REST API
                          v
                 Node.js / Express
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
      MongoDB          Firebase        PayHere
       Atlas            Storage         Payment
          |
          v
       G-Lab Data

                          |
                          v
                     Socket.IO
                          |
                          v
                 Real-Time Updates
```

The backend provides the API layer between the frontend and external services such as MongoDB, Firebase Storage and PayHere.

---

## Project Structure

```text
G-Lab-backend/
│
├── ai/
│   └── agent.js
│
├── Controllers/
│   ├── adminController.js
│   ├── Cartcontroller.js
│   ├── OrderController.js
│   ├── paymentController.js
│   ├── productcontroller.js
│   ├── reviewController.js
│   └── userController.js
│
├── Middleware/
│   ├── adminMiddleware.js
│   ├── authMiddleware.js
│   └── rateLimitMiddleware.js
│
├── models/
│   ├── Cartmodel.js
│   ├── Ordermodel.js
│   ├── PasswordResetModel.js
│   ├── Paymentmodel.js
│   ├── PendingUserModel.js
│   ├── Productmodel.js
│   ├── Reviewmodel.js
│   └── Usermodel.js
│
├── routers/
│   ├── adminRouter.js
│   ├── aiRouter.js
│   ├── CartRouters.js
│   ├── orderRouter.js
│   ├── PaymentRouter.js
│   ├── productRouter.js
│   ├── reviewRouter.js
│   └── userRouter.js
│
├── services/
│   └── productService.js
│
├── utils/
│   ├── payhere.js
│   └── sendEmail.js
│
├── .github/
│   └── workflows/
│       └── docker.yml
│
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── server.js
└── README.md
```

---

## Authentication

The backend uses JWT-based authentication with role-based authorization.

### Registration Flow

```text
User
 |
 v
Registration
 |
 v
Pending User
 |
 v
Email OTP
 |
 v
OTP Verification
 |
 v
User Account Created
```

The registration workflow uses a temporary pending-user record before creating the final user account.

### Login Flow

```text
User
 |
 v
Login
 |
 v
Credential Verification
 |
 v
JWT Token
 |
 v
Protected API Request
 |
 v
Authentication Middleware
 |
 v
Protected Route
```

Protected API requests use:

```text
Authorization: Bearer <JWT_TOKEN>
```

Administrative routes additionally use the admin authorization middleware.

---

## Product Management

The product API supports computer hardware and related products.

Products can contain information such as:

* Name
* Description
* Price
* Category
* Brand
* Stock
* Images
* Specifications
* Warranty
* Availability
* Rating information

The product API supports:

* Product listing
* Product search
* Category filtering
* Brand filtering
* Price filtering
* Pagination
* Price sorting
* Product details
* Admin product management

Example:

```text
GET /products
```

Search:

```text
GET /products?search=gaming
```

Category filtering:

```text
GET /products?category=GPU
```

Price filtering:

```text
GET /products?minPrice=50000&maxPrice=110000
```

Pagination and sorting:

```text
GET /products?page=1&limit=10&sort=price_asc
```

---

## Shopping Cart

Authenticated users can manage their shopping cart.

Supported operations include:

* Add products
* View cart
* Update quantities
* Remove products
* Clear cart

Example:

```text
POST /cart/add
GET /cart
PUT /cart/update/:productId
DELETE /cart/remove/:productId
DELETE /cart/clear
```

---

## Order Management

The backend provides customer and administrator order management.

Customer functionality includes:

* Create orders
* View order history
* View individual orders
* Update eligible order information
* Cancel eligible orders

Administrative functionality includes:

* View all orders
* Search orders
* Filter orders
* View order details
* Update order status

Order status is tracked through the order lifecycle and history.

```text
Pending
   |
   v
Confirmed
   |
   v
Processing
   |
   v
Dispatched
   |
   v
Delivered
```

Inventory management is integrated with order processing so product stock can be updated according to order status and cancellation workflows.

---

## Reviews and Ratings

The backend provides product review and rating functionality.

Users can:

* View product ratings
* View product reviews
* Add reviews
* Update their own reviews
* Delete their own reviews

Product rating information is maintained based on submitted reviews.

Example:

```text
GET /products/:productId/reviews
POST /products/:productId/reviews
PUT /reviews/:id
DELETE /reviews/:id
```

---

## Payments

G-Lab integrates the PayHere payment gateway.

The backend handles:

* Payment initialization
* Payment records
* PayHere transaction parameters
* Payment verification
* PayHere notification handling
* Payment status updates

Typical payment flow:

```text
Customer
   |
   v
Checkout
   |
   v
G-Lab Backend
   |
   v
PayHere
   |
   v
Payment Processing
   |
   v
PayHere Notification
   |
   v
G-Lab Backend
   |
   v
Payment Status Update
```

PayHere Sandbox can be used during development and testing.

For production, the payment notification endpoint must be publicly accessible through a secure HTTPS endpoint.

### PayHere Sandbox Payment

G-Lab uses **PayHere Sandbox** for payment testing.

> **Important:** PayHere Sandbox payments work correctly in the local development environment. However, when testing the payment flow through an online/deployed environment, a publicly accessible domain is required for the PayHere callback/IPN flow.

**Local Development**

* PayHere Sandbox works with the local development setup.
* Backend and frontend can be tested locally during development.

**Online / Deployed Environment**

* A publicly accessible domain is required for PayHere Sandbox callback/IPN communication.
* The deployed backend URL should be configured correctly in the PayHere integration before testing online payments.
* PayHere Sandbox is used for testing only and does not process real payments.

---

## Firebase Storage

Firebase Storage is used for application images such as product images.

The backend stores the resulting image URL together with the relevant application data.

Sensitive Firebase configuration values must be supplied through environment variables and must never be committed to the repository.

---

## Email Services

The backend supports transactional email functionality using:

* Nodemailer
* SMTP / Gmail
* Resend API

Email functionality is used for workflows such as:

* Registration verification
* OTP delivery
* Password recovery
* Application notifications

Email credentials and API keys must be stored in environment variables.

---

## Socket.IO

Socket.IO provides real-time communication between the backend and connected clients.

The system can broadcast events related to application activity such as:

* Product review updates
* Order updates
* Payment updates

This allows the frontend to receive important changes without continuously polling the API.

---

## AI Hardware Assistant

G-Lab includes an AI-powered hardware assistant using Google's Gemini platform.

The AI functionality can assist users with computer hardware related queries and can interact with product information through backend services.

The AI integration is implemented under:

```text
ai/
services/
routers/aiRouter.js
```

Example endpoint:

```text
POST /ai/chat
```

The Gemini API key must be configured through an environment variable.

---

# API Documentation

The backend exposes RESTful APIs under the following main route groups.

## Authentication and User Routes

Base path:

```text
/users
```

Common endpoints include:

```text
POST   /users/create
POST   /users/verify-email
POST   /users/resend-otp
POST   /users/login
POST   /users/forgot-password
POST   /users/verify-reset-otp
POST   /users/reset-password

GET    /users/profile
PUT    /users/profile
PUT    /users/address
PUT    /users/change-password
DELETE /users/delete-account
```

---

## Product Routes

Base path:

```text
/products
```

```text
GET /products
GET /products/:id
```

Example:

```text
GET /products?search=gaming
GET /products?category=GPU
GET /products?brand=ASUS
GET /products?minPrice=50000&maxPrice=110000
GET /products?page=1&limit=10&sort=price_asc
```

---

## Cart Routes

Base path:

```text
/cart
```

```text
POST   /cart/add
GET    /cart
PUT    /cart/update/:productId
DELETE /cart/remove/:productId
DELETE /cart/clear
```

Authentication is required.

---

## Order Routes

Base path:

```text
/order
```

```text
POST  /order
GET   /order/my-orders
GET   /order/:id
PATCH /order/:id/address
PATCH /order/:id/cancel
```

Authentication is required.

---

## Review Routes

```text
GET    /products/:productId/rating
GET    /products/:productId/reviews
POST   /products/:productId/reviews

PUT    /reviews/:id
DELETE /reviews/:id
```

Authentication is required for creating, updating and deleting reviews.

---

## Payment Routes

Base path:

```text
/payments
```

```text
POST /payments/create
GET  /payments/:id
POST /payments/notify
```

The PayHere notification endpoint is used as a server-to-server payment callback.

---

## Admin Routes

Base path:

```text
/admin
```

Administrative functionality includes:

```text
GET    /admin/dashboard
GET    /admin/statistics

GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id/block
PATCH  /admin/users/:id/unblock
DELETE /admin/users/:id

GET    /admin/orders
GET    /admin/orders/search
GET    /admin/orders/filter
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status

GET    /admin/reviews
DELETE /admin/reviews/:id

POST   /admin/products/create
POST   /admin/products/bulk
PUT    /admin/products/update/:id
DELETE /admin/products/:id
```

Administrative endpoints require authentication and administrator authorization.

---

## AI Routes

Base path:

```text
/ai
```

```text
POST /ai/chat
```

---

# Environment Variables

Create a `.env` file in the backend root directory.

Example:

```env
PORT=3001
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

EMAIL_USER=your_email
EMAIL_PASS=your_email_app_password

RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_sender_email

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
PAYHERE_NOTIFY_URL=http://localhost:3001/payments/notify

GEMINI_API_KEY=your_gemini_api_key
```

Never commit:

```text
.env
```

or any real API keys, passwords, database credentials or payment credentials.

---

# Installation

## Prerequisites

Install:

* Node.js
* npm
* Git
* MongoDB or MongoDB Atlas

Docker is required if you want to run the backend as a container.

## Clone Repository

```bash
git clone https://github.com/kavindugeethshan/G-Lab-backend.git
cd G-Lab-backend
```

## Install Dependencies

```bash
npm install
```

## Configure Environment

Create:

```text
.env
```

and configure the required environment variables.

## Start Development Server

```bash
npm start
```

The backend runs on:

```text
http://localhost:3001
```

---

# Postman API Testing

The G-Lab Backend APIs can be tested using Postman.

For protected endpoints:

1. Login using the authentication endpoint.
2. Copy the returned JWT token.
3. Open the required request in Postman.
4. Select Authorization.
5. Select Bearer Token.
6. Enter the JWT token.
7. Send the request.

```text
Authorization: Bearer <JWT_TOKEN>
```

Example authentication flow:

```text
Register
   |
   v
Verify Email
   |
   v
Login
   |
   v
Receive JWT
   |
   v
Use JWT for protected APIs
```

---

# Security

The backend includes several security mechanisms:

* JWT authentication
* bcrypt password hashing
* Protected API routes
* Admin authorization
* Rate limiting
* OTP protection
* Environment-based secrets
* CORS configuration
* Helmet security headers
* Server-side validation
* Secure payment verification
* Production error handling

Real credentials and API keys must never be committed to Git.

---

# Docker

The backend includes a Docker configuration for containerized deployment.

Build the image:

```bash
docker build -t g-lab-backend:latest .
```

Run the container:

```bash
docker run -d \
  --name g-lab-backend \
  -p 3001:3001 \
  --env-file .env \
  g-lab-backend:latest
```

The backend API will then be available through:

```text
http://localhost:3001
```

---

# DevOps and Deployment

G-Lab is also used as a practical DevOps home lab project.

The deployment workflow is designed around Git, GitHub Actions, Docker, GitHub Container Registry and Linux.

```text
Developer
   |
   | git push
   v
GitHub Repository
   |
   v
GitHub Actions
   |
   v
Self-hosted Linux Runner
   |
   v
Docker Build
   |
   v
GitHub Container Registry
   |
   v
Linux Server
   |
   +----------------------+
   |                      |
   v                      v
Frontend Container    Backend Container
                           |
                           v
                      MongoDB Atlas
                           |
                           +---- Firebase
                           |
                           +---- PayHere
```

The backend can be deployed as a Docker container on a Linux server.

Nginx can be used as a reverse proxy in front of the application.

---

# Monitoring

The G-Lab home lab deployment includes infrastructure monitoring using Prometheus and Grafana.

```text
Linux Server
     |
     v
node_exporter
     |
     v
Prometheus
     |
     v
Grafana
```

Prometheus collects system metrics while Grafana provides dashboards for monitoring the Linux environment.

Future observability improvements may include:

* OpenTelemetry
* Application-level tracing
* eBPF-based observability
* Advanced logging
* Container-level monitoring

---

# Frontend Integration

The G-Lab frontend is maintained in a separate repository.

```text
G-Lab Frontend
       |
       | REST API
       v
G-Lab Backend
       |
       +---- MongoDB
       +---- Firebase
       +---- PayHere
       +---- AI Services
```

Frontend technology includes React, Vite, Axios and reusable React components.

---

# Related Project

G-Lab consists of separate frontend and backend repositories.

### Frontend

G-Lab Frontend:

```text
https://github.com/kavindugeethshan/G-Lab-frontend
```

### Backend

G-Lab Backend:

```text
https://github.com/kavindugeethshan/G-Lab-backend
```

---

# Future Improvements

Planned or possible improvements include:

* Automated backend testing
* Improved API documentation
* Advanced application logging
* Redis caching
* OpenTelemetry integration
* eBPF-based observability
* Kubernetes deployment
* AWS cloud deployment
* Advanced CI/CD security scanning
* Automated container security scanning

---

# Current Version

**v1.0.0**

Stable backend baseline:

```text
8e8863c
```

This version represents the stable backend baseline used for the current G-Lab backend release.

---

# Author

**Kavindu Geethshan**

Bachelor of Information Technology (BIT)

University of Colombo School of Computing

GitHub:

```text
https://github.com/kavindugeethshan
```

---
---

# License

This project is developed for educational and portfolio purposes.

