const express = require('express');
const { SIGNUP, LOGIN, authenticateToken, DONATE, RequestMedicineName, NOTIFICATION, GetAllMedicine, deleteMedicine, submitFeedback, getAllProfile, getProfileId } = require('../controllers/medicine.controllers');
const router = express.Router();

// Example of how to use these in your routes
router.post('/signup', SIGNUP);
router.post('/login', LOGIN);
router.post('/donate', authenticateToken, DONATE);
router.post('/request/:medicinename', authenticateToken, RequestMedicineName);
router.get('/notifications', authenticateToken, NOTIFICATION);
router.get('/medicines', GetAllMedicine);
router.delete('/medicine/:medicinename', authenticateToken, deleteMedicine);
router.post('/feedback', authenticateToken, submitFeedback);
router.get('/profile', authenticateToken, getAllProfile);
router.get('/profile/:id', getProfileId);

module.exports = router;
