# Restaurant Reservation App Documentation

Welcome to the Restaurant Reservation App's backend! This app allows users to make restaurant reservations, rate restaurants, and receive reminders about upcoming reservations. It also includes features for managing user authentication, handling reservations, sending notifications, and more.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [User Authentication](#user-authentication)
4. [Restaurant Management](#restaurant-management)
5. [Reservation System](#reservation-system)
6. [Review System](#review-system)
7. [Notifications](#notifications)
8. [API Endpoints](#api-endpoints)
9. [Error Handling](#error-handling)
10. [Additional Features](#additional-features)
11. [Deployment](#Deployment)

## Overview

This app allows users to:
- Create, view, and cancel reservations at restaurants.
- Rate restaurants and leave reviews.
- Receive push notifications and email reminders about reservations.
- Admins can manage reservations and restaurant information.

## Setup

1. Clone the repository.

2. Install the necessary dependencies:
   ```bash
   npm install

3. Configure environment variables:
Create a .env file in the root directory and add the following variables
MONGO_URL=mongodb://yourdbconnection/
PORT=your_specified_port_usually_3000
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
EMAIL_PORT=587
EMAIL_USER=your_email/organization's_email
EMAIL_HOST=the_email_service's_domain
EMAIL_FROM=your_organization's_email
EMAIL_PASSWORD=your_app_password which you have to create via google's account manager
PAYPAL_CLIENT_ID=your_paypal_account_id
PAYPAL_CLIENT_SECRET=your_paypal_account_secret
CLIENT_URL=your_app's_url e.g myapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----/\/=\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIl=your_adminsdk_client_email

4. Start the server:
npx nodemon server.js


## User Authentication
The app uses token-based authentication. All routes requiring user identification are protected by the authMiddleware.

**Register a new user:**
Send a POST request to api/register with the user details:
username
email
password

**Login:**
Send a POST request to api/login with the following:
email
password

The app will return a token upon successful login, which you need to include in the headers for any subsequent requests that require authentication.

## Restaurant Management
Admins can manage restaurant information, such as adding, updating, or deleting restaurants and so can regular user's however they cannot delete or update.

**Add a Restaurant:**
Send a POST request to api/restaurants with:
 name,
 address,
 location with coordinates,
 cuisine,
 rating,
 availableSlots,
 imageUrl

**Update a Restaurant:**
Send a PUT request to api/restaurants/:restaurantId with updated information.

**Delete a Restaurant:**
Send a DELETE request to api/restaurants/:restaurantId to delete a restaurant.

## Reservation System
Regular users can make reservations at restaurants and admins can manage reservations.

**Create a Reservation:**
Send a POST request to /reservation with the following parameters:
restaurantId: ID of the restaurant
amount: Number of people
date: Reservation date (e.g., "2025-01-07T14:30:00Z"UTC)
The system automatically sets the status to "pending" until we get paid. A confirmation email and reminder will be sent as the reservation time approaches.

**View Reservations:**
Send a GET request to api/reservation to view all the user's reservations.
Send a GET request to api/reservation/:restaurantId to view all the reservations for a specific restaurant

**Cancel a Reservation:**
Send a DELETE request to /reservation/:reservationId to cancel a reservation.

**Manual Notification:**
Admins can send a manual notification reminder to users:
Send a POST request to /manual-notification with reservationId.

## Review System
Users can leave reviews and ratings for restaurants.

**Post a Review:**
Send a POST request to /reviews with the following body:
rating (1 to 5)
reviewText (Review text)
restaurantId (ID of the restaurant)

**Get Reviews:**
Send a GET request to api/reviews/:restaurantId to fetch reviews for a specific restaurant.
The average rating is automatically calculated and returned along with reviews.

## Notifications

**Email Notifications:**
The app sends email notifications to users:
Reservation Reminder: Sent 30 minutes before the reservation time.
Follow-up Reminder: Sent a follow-up after the reservation time to ask if the user made it to the restaurant.

**Push Notifications: COMINGSOON**
Push notifications are triggered based on the reservation status and time left until the reservation.
Admins can manually send notifications via the /manual-notification endpoint.

## Api Endpoints/routes

**Auth Routes:**
POST api/register: Register a new user.
POST api/login: Login and receive a token.

**Reservation Routes:**
POST api/reservation: Create a new reservation.
GET api/reservation: Get all reservations for the authenticated user.
DELETE api/reservation/:reservationId: Cancel a reservation.

**Review Routes:**
POST api/reviews: Create a new review for a restaurant.
GET api/reviews/:restaurantId: Get all reviews for a restaurant.

**Restaurant Routes:**
POST api/addR Add a new restaurant.
PUT api/:restaurantId Update restaurant details (Admin only).
DELETE api/:restaurantId Delete a restaurant (Admin only).

**Notification Routes:**
POST api/manual-notification: Send a manual reminder notification (Admin only).

## Error Handling

The app uses standard HTTP status codes to indicate the success or failure of requests if you see a new one tell me about it:

200: Success
201: Resource created successfully
400: Bad request (missing required fields or invalid data)
404: Resource not found
500: Server error

## Additional Features

**Admin Panel:**
Admins can manage reservations, restaurants, and send notifications manually.
Admins are authenticated via a unique login that checks their credentials (admin@admin.com and adminpassword).

**Push Notifications:**
Push notifications are sent to the user when a reservation is coming up or for follow-up reminders.
These are triggered based on the reservation time and status.

**Scheduled Notifications:**
A scheduled job is set to run every 5 minutes to check upcoming reservations and send reminders.

**That's it! You now have a working understanding of how to set up, use, and interact with the Restaurant Reservation App's BACKEND. Happy coding!**