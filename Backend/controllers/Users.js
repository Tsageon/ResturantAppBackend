const User = require('../model/User');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('./email')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Reservation = require('../model/Reservations');
const transporter = require('../controllers/email');
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
        console.log(user.email,user.password,user.role)
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while logging in user' });
    }
};

exports.logoutUser = (req, res) => {
    try {
        res.status(200).json({ message: 'Logout successful' });
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
        res.status(200).json({
            email: user.email,
            phonenumber: user.phonenumber,
            fullname: user.fullname,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while fetching the user profile' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found with the provided email' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save();

        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link below to reset your password:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            message: 'Password reset email sent successfully. Please check your email.',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong while processing the request' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const saltRounds = 10;
        user.password = await bcrypt.hash(password, saltRounds);

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
    adminCheck,
    async (req, res) => {
        const userId = req.userId;
        const { email, password, fullname, role, phonenumber } = req.body;

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
    authMiddleware, adminCheck,
    async (req, res) => {
        const userId = req.userId;
        const { id } = req.params;

        try {
            if (req.userRole === 'admin') {
                const userToDelete = await User.findById(id);
                if (!userToDelete) {
                    return res.status(404).json({ message: 'User not found' });
                }
                await userToDelete.remove();
                return res.status(403).jsn({ message: 'user account deleted successfully' })
            }
            if (userId.toString() !== id) {
                return res.status(403).json({ message: 'Only admins can delete other Users' });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'something went wrong while deleting the user' })
        }
    }
];

exports.manualSendNotification = [
    authMiddleware,
    async (req, res) => {
        const { reservationId } = req.body;

        try {
            const reservation = await Reservation.findById(reservationId);

            if (!reservation) {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            const user = await User.findById(reservation.userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const email = user.email;
            const subject = 'Manual Reservation Reminder';
            const text = `Your reservation at the restaurant is coming up soon. Please get ready!`;
            const html = `<p>Your reservation at the restaurant is coming up soon. Please get ready!</p>`;

            await sendEmail(email, subject, text, html);

            res.status(200).json({ message: `Manual notification sent to ${email}` });
        } catch (error) {
            console.error('Error sending manual notification:', error);
            res.status(500).json({ message: 'Failed to send manual notification' });
        }
    }
];