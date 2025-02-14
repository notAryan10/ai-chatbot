import express from 'express';
import { OpenAI } from 'openai';
import Message from '../models/Message.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Verify OpenAI API key
if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is not set in environment variables');
    process.exit(1);
}

// Initialize OpenAI with explicit API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// Test the OpenAI connection
const testOpenAIConnection = async () => {
    try {
        console.log('OpenAI API Key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
        
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Test" }],
            model: "gpt-3.5-turbo",
            max_tokens: 5
        });
        console.log('OpenAI connection successful');
        return true;
    } catch (error) {
        console.error('OpenAI connection failed:', error.message);
        return false;
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
        const { content, userId } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        console.log('Processing message:', { content, userId });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: content }
            ],
            temperature: 0.7,
            max_tokens: 150,
            presence_penalty: 0,
            frequency_penalty: 0
        });

        console.log('OpenAI response received');
        const aiResponse = completion.choices[0].message.content;
        
        // Log success
        console.log('Sending response back to client');
        res.json({ content: aiResponse });

    } catch (error) {
        // Enhanced error logging
        console.error('Message route error:', {
            message: error.message,
            stack: error.stack,
            details: error.response?.data || error.cause || error
        });

        // Send appropriate error response
        if (error.response?.status === 429 || error.message.includes('quota')) {
            res.status(429).json({ 
                error: 'API rate limit exceeded. Please try again later.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to process message',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

export default router; 