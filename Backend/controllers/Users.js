require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('./email');
const User = require('../model/User');
const Reservation = require('../model/Reservations');
const adminCheck = require('../controllers/Admin');
const authMiddleware = require('../controllers/Auth');


exports.registerUser = async (req, res) => {
    const { email, password, phonenumber, fullname, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already being used' });
        }

        let userRole = 'user';

        if (email === process.env.ADMIN_EMAIL) {
            const adminPassword = process.env.ADMIN_PASSWORD
            if (password !== adminPassword) {
                return res.status(400).json({ message: 'Invalid/incorrect admin password' });
            }
            userRole = 'admin';
        }

        const newUser = new User({
            email,
            password,
            fullname,
            phonenumber,
            role: role || userRole
        })

        const SaltRounds = 10;
        newUser.password = await bcrypt.hash(password, SaltRounds);

        await newUser.save();
        console.log(newUser)

        res.status(201).json({
            message: 'Userinfo saved successfully',
            user: { email: newUser.email, fullname: newUser.fullname, role: newUser.role, phonenumber: newUser.phonenumber }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        console.log('Received login request:', req.body);
        console.log('Querying database for user:', req.body.email);

        if (!user) {
            return res.status(404).json({ message: 'User not found or you entered the wrong credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token
        });
        console.log(user.email, user.password, user.role)
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while logging in user' });
    }
};

exports.logoutUser = (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            const userId = decoded.userId;
            console.log(`User with ID: ${userId} logged out`);

            res.status(200).json({ message: 'Logout successful' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while logging out' });
    }
};


exports.getUser = async (req, res) => {
    const userId = req.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User does not exist' });
        }

        const reservations = await Reservation.find({ userId }).populate('userId').populate('restaurantId');

        res.status(200).json({
            user: {
                email: user.email,
                phonenumber: user.phonenumber,
                fullname: user.fullname,
                role: user.role,
                createdAt: user.createdAt
            },
            reservations: reservations.length > 0 ? reservations : 'No reservations yet'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while fetching the user profile and reservations' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};



exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    console.log('Request body:', req.body);

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found with the provided email' });
        }
        const hostedURL = process.env.HOSTED_URL || 'http://localhost:4000';
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        console.log('HOSTED_URL:', process.env.HOSTED_URL);
        const resetURL = `${hostedURL}/api/reset-password/${resetToken}`;

        const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.`;
        const html = `<p>You requested a password reset. Click the link below to reset your password:</p>
          <p>
             <form action="${resetURL}" method="POST">
             <label for="password">New Password</label>
             <input type="password" name="password" required />
             <button type="submit">Reset Password</button>
           </form>
          </p>
          <p>If you didn't request this, please ignore this email.</p>`;

        const subject = 'Password Reset Request';
        const emailSent = await sendEmail(user.email, subject, text, html);

        if (emailSent) {
            res.status(200).json({
                message: 'Password reset email sent successfully. Please check your email.',
            });
        } else {
            res.status(500).json({ message: 'Failed to send password reset email.' });
        }
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ message: 'Something went wrong while processing the request' });
    }
};



exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const passwordString = String(password);
    console.log('Request body:', req.body);

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });


        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        if (!passwordString) {
            return res.status(400).json({ message: 'Password is needed' });
        }

        const saltRounds = 10;


        user.password = await bcrypt.hash(passwordString, saltRounds);
        console.log('Password from request body:', passwordString);
        console.log('Password', password)

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while resetting the password' });
    }
};

exports.updateUser = [
    authMiddleware,
    async (req, res) => {
        const userId = req.userId;
        const { email, password, fullname, role, phonenumber } = req.body;
        console.log('Request body:', req.body);


        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (userId.toString() !== userId) {
                return res.status(403).json({ message: 'You can only update your own profile' });
            }

            if (role && req.userRole !== 'admin') {
                return res.status(403).json({ message: 'Only admins can update roles' });
            }

            if (req.userRole === 'admin') {
                if (email) user.email = email;
                if (fullname) user.fullname = fullname;
                if (phonenumber) user.phonenumber = phonenumber;
                if (password) {
                    const saltRounds = 10;
                    user.password = await bcrypt.hash(password, saltRounds);
                }
            } else {
                if (email) user.email = email;
                if (fullname) user.fullname = fullname;
                if (phonenumber) user.phonenumber = phonenumber;
                if (password) {
                    const saltRounds = 10;
                    user.password = await bcrypt.hash(password, saltRounds);
                }
            }

            await user.save();
            res.status(200).json({
                message: 'User updated successfully',
                user: { email: user.email, fullname: user.fullname, role: user.role, phonenumber: user.phonenumber }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong while updating the user' });
        }
    }
];

exports.deleteUser = [
    authMiddleware,
    adminCheck,
    async (req, res) => {
        const { id } = req.params;
        const userId = req.userId;
        const userRole = req.userRole;

        try {
            const userToDelete = await User.findById(id);
            if (!userToDelete) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (userRole === 'admin') {
                await userToDelete.remove();
                return res.status(200).json({ message: 'User account deleted successfully' });
            }

            if (userId.toString() !== id) {
                return res.status(403).json({ message: 'Only admins can delete other users' });
            }

            await userToDelete.remove();
            return res.status(200).json({ message: 'Your account has been deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Something went wrong while deleting the user' });
        }
    },
];


exports.manualSendNotification = [
    authMiddleware,  
    async (req, res) => {
        const { reservationId } = req.body;
        console.log('Request body:', req.body);

        try {
            const reservation = await Reservation.findById(reservationId);

            if (!reservation) {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            const user = await User.findById(reservation.userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const pushToken = user.deviceToken;

            if (pushToken) {
                const pushTitle = 'Manual Reservation Reminder';
                const pushBody = 'Your reservation at the restaurant is coming up soon. Please get ready!';

                try {
                    await sendPushNotification(pushToken, pushTitle, pushBody);
                    res.status(200).json({ message: `Manual push notification sent to ${user.email}` });
                    console.log(`Sent push notification to ${user.email}`);
                } catch (pushError) {
                    console.error(`Error sending push notification to ${user.email}:`, pushError);
                }
            } else {
                const email = user.email;
                const subject = 'Manual Reservation Reminder';
                const text = `Your reservation at the restaurant is coming up soon. Please get ready!`;
                const html = `<p>Your reservation at the restaurant is coming up soon. Please get ready!</p>`;

                try {
                    await sendEmail(email, subject, text, html);
                    res.status(200).json({ message: `Manual email sent to ${user.email}` });
                    console.log(`Sent email reminder to ${email}`);
                } catch (emailError) {
                    console.error(`Error sending email to ${email}:`, emailError);
                }
            }

            res.status(200).json({ message: `Manual notification sent to ${user.email}` });
        } catch (error) {
            console.error('Error sending manual notification:', error);
            res.status(500).json({ message: 'Failed to send manual notification' });
        }
    }
];

exports.sendNotifications = async (req, res) => {
    const { deviceToken, title, body, icon } = req.body;

    try {
        const payload = JSON.stringify({
            title,
            body,
            icon,
        });

        if (deviceToken) {
            const success = await sendPushNotification(deviceToken, title, body);
            if (success) {
                return res.status(200).json({ message: 'Notification sent successfully!' });
            } else {
                return res.status(500).json({ message: 'Notification failed!' });
            }
        } else {
            const users = await User.find({ 'subscription.endpoint': { $exists: true } });

            const promises = users.map(user =>
                webPush.sendNotification(user.subscription, payload)
                    .catch(error => console.error('Error sending notification to:', user.email, error))
            );

            await Promise.all(promises);

            return res.status(200).json({ message: 'Notifications sent successfully!' });
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ message: 'Error sending notifications' });
    }
};



exports.Notification = async (req, res) => {
    const { token } = req.body;  
    const userId = req.userId;    
  
    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId, 
            { deviceToken: token }, 
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Token stored successfully', user: user });
    } catch (error) {
        console.error('Error storing token:', error);
        res.status(500).json({ message: 'Error storing token' });
    }};

exports.Subscribe = async (req, res) => {
        const {email, subscription } = req.body;
        
        try {
            const user = await User.findOne({ email });
    
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            user.subscription = subscription;
            await user.save();
    
            res.status(200).json({ message: 'Subscription saved successfully!' });
        } catch (error) {
            console.error('Error saving subscription:', error);
            res.status(500).json({ message: 'Error saving subscription' });
        }
    }