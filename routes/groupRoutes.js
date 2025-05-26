const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.get('/groups', groupController.getGroups);

module.exports = router;
