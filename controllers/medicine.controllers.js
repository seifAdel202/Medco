const User = require('../models/user.js');
const Medicine = require('../models/medicine.js');
const Feedback = require('../models/feedback.js');
const Request = require('../models/request.js');
const Notification = require('../models/notification.js');

const SIGNUP = async (req, res) => {
    try {
        const { name, email, password, address, phone } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            address,
            phone
        });

        // Save user to database
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const LOGIN = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your_secret_key');
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    });
};

const DONATE = async (req, res) => {
    try {
        const { medicinename, exp_date, address, phone, description } = req.body;
        const userId = req.user.userId; // Extract userId from authenticated user

        if (!medicinename || !exp_date || !address || !phone || !description) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const medicine = new Medicine({
            medicinename,
            exp_date,
            address,
            phone,
            description,
            userId
        });

        await medicine.save();

        res.status(201).json({ message: 'Medicine donated successfully' });
    } catch (error) {
        console.error('Error donating medicine:', error);
        res.status(500).json({ error: 'Failed to donate medicine' });
    }
};

const RequestMedicineName = async (req, res) => {
    try {
        const { medicinename } = req.params;
        const userId = req.user.userId;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentRequestsCount = await Request.countDocuments({
            userId,
            createdAt: { $gte: oneWeekAgo }
        });

        if (recentRequestsCount >= 3) {
            return res.status(400).json({ error: 'You can only request up to 3 medicines per week.' });
        }

        const existingRequest = await Request.findOne({ medicinename, userId });
        if (existingRequest) {
            return res.status(400).json({ error: 'Medicine is already requested' });
        }

        const donorMedicine = await Medicine.findOne({ medicinename }).populate('userId');
        if (!donorMedicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        const donorId = donorMedicine.userId._id;

        const requester = await User.findById(userId).select('name address phone');
        if (!requester) {
            return res.status(404).json({ error: 'Requester not found' });
        }

        const newRequest = new Request({
            medicinename,
            userId,
            requested: true
        });

        await newRequest.save();

        const donorNotification = new Notification({
            userId: donorId,
            message: `You have a new request for the medicine: ${medicinename} from ${requester.name} (Address: ${requester.address}, Phone: ${requester.phone}).`
        });

        await donorNotification.save();

        const requesterNotification = new Notification({
            userId,
            message: `Your request for the medicine: ${medicinename} has been submitted.`
        });

        await requesterNotification.save();

        res.status(200).json({ message: 'Medicine requested successfully', newRequest });
    } catch (error) {
        console.error('Error requesting medicine:', error);
        res.status(500).json({ error: 'Failed to request medicine' });
    }
};

const NOTIFICATION = async (req, res) => {
    try {
        const userId = req.user.userId;

        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

const GetAllMedicine = async (req, res) => {
    try {
        const donatedMedicines = await Medicine.find({}).populate('userId', 'name _id');

        const formattedMedicines = donatedMedicines.map(medicine => ({
            donorId: medicine.userId ? medicine.userId._id : 'Unknown ID',
            donorName: medicine.userId ? medicine.userId.name : 'Unknown Donor',
            medicinename: medicine.medicinename,
            exp_date: medicine.exp_date,
            address: medicine.address,
            phone: medicine.phone,
            description: medicine.description
        }));

        res.json(formattedMedicines);
    } catch (error) {
        console.error('Error fetching donated medicines with donor names and IDs:', error.message);
        res.status(500).json({ error: 'Failed to fetch donated medicines with donor names and IDs', details: error.message });
    }
};

const deleteMedicine = async (req, res) => {
    try {
        const medicinename = req.params.medicinename;
        const deletedMedicine = await Medicine.deleteOne({ medicinename });
        if (deletedMedicine.deletedCount > 0) {
            res.status(200).json({ message: 'Medicine deleted successfully' });
        } else {
            res.status(404).json({ error: 'Medicine not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete medicine' });
    }
};

const submitFeedback = async (req, res) => {
    try {
        const { ratedUserId, rating, comment } = req.body;
        const userId = req.user.userId;

        const feedback = new Feedback({
            userId,
            ratedUserId,
            rating,
            comment
        });

        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting feedback.' });
    }
};

const getAllProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const feedback = await Feedback.find({ ratedUserId: userId }).select('rating comment');
        const totalRating = feedback.length > 0 ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0;

        const donatedMedicines = await Medicine.find({ userId }).select('medicinename');
        const requestedMedicines = await Request.find({ userId }).select('medicinename');

        const { name, address, phone } = user;
        const profileData = {
            name,
            address,
            phone,
            rating: totalRating,
            feedback: feedback.map(item => ({ rating: item.rating, comment: item.comment })),
            donatedMedicines: donatedMedicines.map(item => item.medicinename),
            requestedMedicines: requestedMedicines.map(item => item.medicinename),
        };
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfileId = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const feedback = await Feedback.find({ ratedUserId: userId }).select('rating comment');
        const totalRating = feedback.length > 0 ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0;

        const donatedMedicines = await Medicine.find({ userId }).select('medicinename');
        const requestedMedicines = await Request.find({ userId }).select('medicinename');

        const { name, address, phone } = user;
        const profileData = {
            name,
            address,
            phone,
            rating: totalRating,
            feedback: feedback.map(item => ({ rating: item.rating, comment: item.comment })),
            donatedMedicines: donatedMedicines.map(item => item.medicinename),
            requestedMedicines: requestedMedicines.map(item => item.medicinename),
        };
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    SIGNUP,
    LOGIN,
    authenticateToken,
    DONATE,
    RequestMedicineName,
    NOTIFICATION,
    GetAllMedicine,
    deleteMedicine,
    submitFeedback,
    getAllProfile,
    getProfileId
};
