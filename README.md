# RestaurantAppBackend

Welcome to the **RestaurantAppBackend** repo! This backend application serves as the server-side implementation for a restaurant management system. It allows users to interact with a variety of restaurant-related data such as available slots, restaurants, and more.

This backend is built using **Node.js**, **Express.js**, **MongoDB**, **Paypal**, **Nodemailer**, and **Moment.js** for handling date and time operations across different time zones.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)

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
- **Nodemon**: Automatically restarts the node application when file changes are detected.
- **Express.js**: Web framework for Node.js, used for handling routing, rate-limiting, and middleware.
- **MongoDB**: NoSQL database for storing restaurant data.
- **Bcrypt.js**: Helps in hashing passwords.
- **Moment.js**: Library for handling dates and times, especially for converting and formatting date/time data.
- **Mongoose**: ODM library for MongoDB, used to define data models and manage collections.
- **Paypal**: Payment gateway for handling transactions.
- **Nodemailer**: Library for sending email notifications.
- **Timezone Middleware**: Custom middleware for managing time zone conversions for date/time data.

## Installation

Ensure that you have Node.js and npm installed. If not, you can install them from the official Node.js website. Ensure you have a MongoDB instance running locally or use MongoDB Atlas. Update the database connection settings in the `.env` file.

### 1. Clone the repository

````bash
git clone https://github.com/Tsageon/ResturantAppBackend.git
cd ResturantAppBackend/Backend

## 2. Install dependencies
```bash
npm install

## 3.Run The Server

To start the application, run:
```bash
node Server.js or
npx nodemon Server.js

This will start the server on port 4000 (or the one you configured).

### 4. Set up Paypal and NodeMailer

PayPal: You will need to create a PayPal Developer account to obtain your Client ID and Secret for testing payments. Follow PayPal's documentation for setup or here https://developer.paypal.com/docs/checkout/.
NodeMailer: Set up an email provider (e.g., Gmail, SendGrid) for sending emails and configure the SMTP settings in the .env file.

## Configuration

Before running the server, make sure to create a .env file in the root of the project.

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

Just use Postman to test these also remember the port your server is running on like
this http://localhost:<your-port>/api/ just remember to login in first otherwise the
authMiddleware will prevent you from using the CUD methoods from CRUD.

**Resturant Endpoints**
1. **GET** /api/getR
Fetches all the restaurants.

It should return an array of restaurant objects like so:

{
  "restaurants": [
    {
      "_id": "123",
      "name": "Restaurant 1",
      "address": "123 Main St",
      "location": {
        "type": "Point",
        "coordinates": [-28.7365, 24.7623]
      },
      "createdAt": "2025-01-08 15:55:18 +02:00",
      "availableSlots": [
        {
          "startTime": "2025-01-10 18:00:00 +02:00",
          "endTime": "2025-01-10 22:00:00 +02:00"
        }
      ]
    }
  ]
}

2. ** GET** api/getR/restaurant:id (like so api/getR/123)
Fetches a specific restaurant based on the it's Id.

It should return this info and just this info:

{
  "restaurants": [
    {
      "_id": "123",
      "name": "Restaurant 1",
      "address": "123 Main St",
      "location": {
        "type": "Point",
        "coordinates": [-28.7365, 24.7623]
      },
      "createdAt": "2025-01-08 15:55:18 +02:00",
      "availableSlots": [
        {
          "startTime": "2025-01-10 18:00:00 +02:00",
          "endTime": "2025-01-10 22:00:00 +02:00"
        }
      ]
    }
  ]
}

3. **POST** /api/addR
Adds resturant info to your database mongoDB in this case.

It should return this info also thanks to momemnto uses Africa/Johannesburg
as a fallback if you don't specify your timezone in the header in postman or
it can't auto detect it refer to https://docs.momentohq.com/platform/sdks/nodejs
for more clarity:

{
  "name": "Sushi Delight",
  "address": "123 Tokyo Ave",
  "location": "Tokyo, Japan",
  "cuisine": "Japanese",
  "rating": 4.8,
  "availableSlots": [
    {
      "startTime": "2025-01-11T12:00:00+09:00",
      "endTime": "2025-01-11T14:00:00+09:00",
      "isAvailable": true
    },
    {
      "startTime": "2025-01-11T18:00:00+09:00",
      "endTime": "2025-01-11T20:00:00+09:00",
      "isAvailable": true
    }
  ],
  "imageUrl": "https://example.com/sushi.jpg"
}

4. **PUT** /api/:id (like this api/123)
Updates the restaurant info in your database mongoDB in this case.

it should return something similar to this:

{
  "name": "Updated Sushi Delight",
  "cuisine": "Fusion",
  "availableSlots": [
    {
      "startTime": "2025-01-11T12:00:00+09:00",
      "endTime": "2025-01-11T13:30:00+09:00",
      "isAvailable": true
    }
  ]
}

5. **DELETE** /api/restaurant-id (like this /api/123)
Deletes the restaurant info in your database mongoDB in this case.

Should return this response you can verify by using getR:

{
  "message": "Restaurant deleted successfully"
};

###2. User Endpoints
1. **GET** /api/users (Admins Only)
Get's every user's app related info on the Database and nothing else.

It should return:
200 OK with a list of users if accessed by an admin.
403 Forbidden if accessed by a non-admin user.

2. **GET** /api/reviews/:restaurantId
Get's every review of a specific restaurant.

The response should be similar to this:
[
    {
        "reviewId": "abc123",
        "userId": "xyz789",
        "restaurantId": "63f26c7bfc13ae5d5e000012",
        "rating": 4.5,
        "comment": "Great food and ambiance!",
        "createdAt": "2023-11-15T12:00:00Z"
    },
    {
        "reviewId": "def456",
        "userId": "uvw123",
        "restaurantId": "63f26c7bfc13ae5d5e000012",
        "rating": 5,
        "comment": "Exceptional service!",
        "createdAt": "2023-11-10T10:30:00Z"
    }
]
0r:
{
    "message": "Restaurant not found"
}
Even, if No Reviews Found:[];

3. **GET** /api/profile
Fetches the logged-in user's profile.

It should return:
200 OK with user details if the authMiddleware has been set up properly.

4. **POST** /api/register
Registers a new user.

Your request should look something like this or however you decide to define the scheama:
{
  "fullname": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "phonenumber":"1234567890"
}

5. **POST** /api/login
Logs in the user if they exist.

The request should be similar to this:
{
  "email": "john.doe@example.com",
  "password": "password123"
}

The response should be:
200 OK with a JWT token if successful.
401 Unauthorized if credentials are incorrect.

6. **POST** /api/logout
Logs out the user.

The response should be if the token is valid:
200 OK with a success message.
403 Forbidden if the token is invalid.

7. **POST** /api/forgot-password
Sends a password reset link to the user's email.

Your request should look like this:
{
  "email": "john.doe@example.com"
}

The response:
200 OK with a message indicating email was sent also wait a few minutes for the email to arrive.

8. **POST** /reset-password/:token (the one your gonna get from clicking on the link from forgotpassword email)
Reset the password of the user.

This is the request body :
{
  "password": "newPassword123"
}

The response should be:
200 OK if the password reset is successful.

9. POST /api/manual-notification(ADMINS Only if the scheduler fails)
Sends a notification to the user's email.

The request should look something like this and since the reservation
id is tied to the user's email it will get sent to them do not fret:
{
    "reservationId": "63f26c7bfc13ae5d5e000012"
}
Replace 63f26c7bfc13ae5d5e000012 with a valid reservationId from your database.

The response shuld be;
{
    "message": "Manual notification sent to user@example.com"
}
or:
{
    "message": "Reservation not found"
}
even:
{
    "message": "User not found"
}
finally:
{
    "message": "Failed to send manual notification"
}

10. POST /api/reviews
Create a new review for a reservation.

The request body should look like this:
{
  "restaurantId": "12345",
  "rating": 4,
  "review": "Great food and service!"
}

The response should be:
201 Created with the review details and the reviewee's email oh and
only authenticated users can do this.

11. PUT /api/edit(Admins can update roles and everything else)
Updates the logged-in user's profile.

The Body should look like this:
{
  "fullname": "Johnny Doe Updated",
  "email": "phil.mcrakin.updated@example.com",
  "phonenumber":"0987654321"
}

The response should say:
{
"message":"user updated successfully"
}

12. DELETE  /api/:id (Admins can delete anyone)
Deletes a User by id.

Replace :id with the ID of the user you want to delete.
If you're deleting the admin account, use the admin's ID.
If you're deleting a user's own account, use their own id.

The response should be:
{
  "message": "User account deleted successfully"
}
or(If the user is trying to delete another account and is not an admin):
{
  "message": "Only admins can delete other Users"
}
even (If the user with the provided id does not exist):
{
  "message": "User not found"
}
finally(server side issues):
{
  "message": "Something went wrong while deleting the user"
}

## Reservation Endpoints

Now these endpoints don't utilize "/api" route just use "/" because I utilized
turning a controller into with routes inside to save time.

1. GET /reservations
Gets all reservations for the logged-in user.
You have to be logged in for this one since the info is user-specific!

2. GET /reservation:id
Gets a specific reservation by id also user specific.

The response should be:
200 OK: Reservation details.
or
404 Not Found: Reservation not found or unauthorized access.

3. GET /payment/success
Handles successful payment after Paypal redirects the user back.

The url should look like this: "/payment/success?paymentId=PAYMENT_ID&PayerID=PAYER_ID"
(replace PAYMENT_ID and PAYER_ID with actual PayPal data)

The responses should be:
200 OK: Payment successful and reservation status updated.
400 Bad Request: Missing payment details.
500 Internal Server Error: Error during payment execution.

4.GET /payment/cancel
Handles cancelled payment after Paypal redirects the user back.

The url should look like this: "/payment/cancel?reservationId=<reservationId>"
Replace <reservationId> with a valid reservationId from a reservation that
has been created and is pending.

The responses:
{
  "message": "Reservation canceled and slot made available"
}
If the reservation doesn't exist or any issue occurs, you will get a 404 or
500 response with an appropriate error message
Just double check using GetR

3. POST /reservation
Creates a new reservation for the logged-in user also until
we get paid the reservation will stay pending.

Your body has to include these :
restaurantId: ID of the restaurant for the reservation.
startTime: Start time of the reservation.
endTime: End time of the reservation.
amount: Total cost of the reservation.

Like this:
{
  "restaurantId": "restaurantIdHere",
  "startTime": "2025-01-10T12:00:00Z",
  "endTime": "2025-01-10T14:00:00Z",
  "amount": 50
}

The responses:
201 Created: Reservation successfully created.
400 Bad Request: Invalid fields or time slot unavailable.
404 Not Found: Restaurant not found.

4. POST /pay
Pays for a reservation uses paypal. You have to be logged in and the reservation has to be pending.

The body should look like this:
{
  "reservationId": "reservationIdHere",
  "amount": 50
}

The response:
{
A redirect link will appear if clicked on will redirect to paypal where payment will be completed.
}

5. PUT /reservation/:id
Updates a specific reservation by id also user specific.
The body should be similar to this:
{
  "startTime": "2025-01-10T13:00:00Z",
  "endTime": "2025-01-10T15:00:00Z",
  "amount": 75
}

The responses:
200 OK: Reservation updated.
400 Bad Request: Invalid fields or time slot unavailable.
404 Not Found: Reservation not found.

## Authorization Token
To test endpoints requiring authentication (authMiddleware), log in or
register a user using your authentication endpoint to get a JWT token.

In Postman, go to the Authorization tab and select:
Type: Bearer Token
Token: Paste the JWT token.

## Testing Edge Cases

Test the validations by sending incorrect or incomplete data, such as:

Missing required fields (e.g., omit name or cuisine).
Invalid availableSlots (e.g., overlapping slots, invalid date formats).
Updating a restaurant with a non-existent id.

## Tips for Easier Testing
**1. Use Environment Variables:**
In Postman, create variables for common values like the baseURL, port
or token to avoid retyping them.
Example: {{baseURL}}/restaurant
