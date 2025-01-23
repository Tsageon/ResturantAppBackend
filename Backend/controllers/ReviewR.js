const Review = require('../model/Review');
const Restaurant = require('../model/Resturant');
const authMiddleware = require('./Auth');


const calculateAverageRating = async (restaurantId) => {
    const reviews = await Review.find({ restaurantId });
    if (reviews.length === 0) return 0;

    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    return totalRating / reviews.length;
};

exports.getReviews = async (req, res) => {
    const { restaurantId } = req.params;

    try {
        const reviews = await Review.find({ restaurantId });

        if (reviews.length === 0) {
            return res.status(404).json({ message: 'No reviews found for this restaurant' });
        }

        const averageRating = await calculateAverageRating(restaurantId);

        res.status(200).json({
            message: 'Reviews fetched successfully',
            reviews,
            averageRating
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }};

exports.createReview = [
    authMiddleware,
    async (req, res) => {
        const { rating, reviewText, restaurantId } = req.body;
        const { userId } = req;

        if (!rating || !reviewText || !restaurantId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            const newReview = new Review({
                userId,
                restaurantId,
                rating,
                reviewText
            });

            await newReview.save();

            const averageRating = await calculateAverageRating(restaurantId);

            res.status(201).json({
                message: 'Review created successfully',
                review: newReview,
                averageRating
            });
        } catch (error) {
            console.error('Error creating review:', error);
            res.status(500).json({ message: 'Failed to create review' });
        }}];

exports.getRestuarantDetails = async (req, res) => {
    const { restaurantId } = req.params;

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) { 
            return res.status(404).json({ message: 'Restaurant not found or it does not have a rating!' });
        }

        const reviews = await Review.find({restaurantId});
        const averageRating = await calculateAverageRating(restaurantId);

        res.status(200).json({
            message: 'Restaurant details retrieved successfully',
            restaurant,
            reviews,
            averageRating
        });
    } catch (error) {
        console.error('Error fetching restaurant details', error);
        res.status(500).json({ message: 'Failed to fetch restaurant details' });
    }}