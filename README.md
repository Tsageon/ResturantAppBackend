# RestaurantAppBackend

Welcome to the **RestaurantAppBackend** repo! This backend application serves as the server-side implementation for a restaurant management system. It allows users to interact with a variety of restaurant-related data such as available slots, restaurants, and more. 

This backend is built using **Node.js**, **Express.js**, **MongoDB**, **Paypal**, **Nodemailer** and **Moment.js** for handling date and time operations across different time zones.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Features

- **Restaurant Data**: Allows CRUD operations on restaurant data such as name, address, location, cuisine, etc.
- **Available Slots**: Each restaurant has a set of available time slots, which users can interact with.
- **Time Zone Support**: Supports time zone conversion for time-related data like `createdAt`, `startTime`, and `endTime`.
- **User Authentication**: A basic user authentication flow, ensuring access to restaurant data.
- **MongoDB Integration**: Data is stored and managed in MongoDB.
- **Paypal Integration**: Supports payment processing through PayPal.
- **Nodemailer Integration**: Sends email notifications to users.

## Technologies Used

- **Node.js**: JavaScript runtime environment for building server-side applications.
- **Express.js**: Web framework for Node.js, used for handling routing and middleware.
- **MongoDB**: NoSQL database for storing restaurant data.
- **Moment.js**: Library for handling dates and times, especially for converting and formatting date/time data.
- **Mongoose**: Object Data Modeling (ODM) library for MongoDB, used to define data models and manage MongoDB collections.
- **Paypal**: Payment gateway for handling transactions.
- **Nodemailer**: Email sending library for sending notifications to users.
- **Timezone Middleware**: Custom middleware for managing time zone conversions for date/time data.

## Installation

Ensure that you have Node.js and npm installed. If not, you can install them from the official Node.js website.
Ensure you have a MongoDB instance running locally or use a MongoDB cloud service like MongoDB Atlas. Update the database connection settings in the .env file.

To get the project up and running locally, follow these steps:

### 1. Clone the repository

```bash
git clone https://github.com/Tsageon/ResturantAppBackend.git
cd ResturantAppBackend/Backend

### 2. Install dependencies

Once Node.js is installed, run the following command to install the project dependencies:

```bash
npm install

### 3. Set up Paypal and NodeMailer

PayPal: You will need to create a PayPal Developer account to obtain your Client ID and Secret for testing payments. Follow PayPal's documentation for setup.
NodeMailer: Set up an email provider (e.g., Gmail, SendGrid) for sending emails and configure the SMTP settings in the .env file.

### 4. Run The Server
To start the application, run:

```bash
node Server.js or npx nodemon Server.js

This will start the server on port 4000 (or the one you configured).

## Configuration

Before running the server, make sure to create a .env file in the root of the project.
It should look like this:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/restaurantApp(this is just locally use MongoDBAtlas to get a proper connection url/string if you move out of dev to live)
TIMEZONE=Africa/Johannesburg(Or the one you used)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
MAIL_HOST=smtp.gmail.com(or your prefered host)
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASS=your-email-password

## Api Endpoints

Just use Postman to test these also remember the port your server is running on 

1. GET api/getR
Description: Fetch all the restaurants.
Response: Returns an array of restaurant objects.

