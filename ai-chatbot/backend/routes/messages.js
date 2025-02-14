import express from 'express';
import OpenAI from 'openai';
import Message from '../models/Message.js';

const router = express.Router();

// Verify OpenAI API key is available and valid
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables');
}

// Initialize OpenAI with explicit API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY.trim(),
});

// Test the OpenAI connection
const testOpenAIConnection = async () => {
    try {
        await openai.chat.completions.create({
            messages: [{ role: "user", content: "Test" }],
            model: "gpt-3.5-turbo",
            max_tokens: 5
        });
        console.log('OpenAI connection successful');
    } catch (error) {
        console.error('OpenAI connection failed:', error.message);
        throw error;
    }
};

// Test connection on startup
testOpenAIConnection();

// Get all messages
router.get('/', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new message and get AI response
router.post('/', async (req, res) => {
    try {
        // Save user message
        const userMessage = new Message({
            content: req.body.content,
            role: 'user'
        });
        await userMessage.save();

        // Get AI response
        const completion = await openai.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful AI assistant. Provide clear and concise responses."
                },
                { 
                    role: "user", 
                    content: req.body.content 
                }
            ],
            model: "gpt-3.5-turbo",
        });

        // Save AI response
        const aiMessage = new Message({
            content: completion.choices[0].message.content,
            role: 'assistant'
        });
        await aiMessage.save();

        // Send AI response back to client
        res.status(201).json(aiMessage);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error processing message', error: err.message });
    }
});

export default router; 