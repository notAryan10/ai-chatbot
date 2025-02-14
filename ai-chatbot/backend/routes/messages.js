import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

// Get all messages
router.get('/', async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new message
router.post('/', async (req, res) => {
    const message = new Message({
        content: req.body.content
    });

    try {
        const newMessage = await message.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

export default router; 