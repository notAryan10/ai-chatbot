import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import messageRoutes from './routes/messages.js';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file early
const result = dotenv.config();

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

// Verify environment variables
const requiredEnvVars = {
    MONGODB_URI: process.env.MONGODB_URI,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

console.log('Environment variables loaded:', {
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT || '5005 (default)'
});

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3003', 'http://localhost:3002', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Enhanced MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('MongoDB Connected');
        
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Routes
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        openai: process.env.OPENAI_API_KEY ? 'OpenAI key is set' : 'OpenAI key is missing',
        mongodb: mongoose.connection.readyState === 1 ? 'MongoDB is connected' : 'MongoDB is not connected'
    });
});

app.use('/api/messages', messageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', {
        message: err.message,
        stack: err.stack,
        details: err.response?.data || err.cause || err
    });

    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});

// Make sure MongoDB connects before starting the server
const startServer = async (retryCount = 0) => {
    try {
        await connectDB();
        
        const basePort = parseInt(process.env.PORT || '5005');
        const port = basePort + retryCount;  // This will increment by 1 each time

        try {
            const server = await new Promise((resolve, reject) => {
                const server = app.listen(port, () => {
                    console.log(`Server is running on port ${port}`);
                    console.log(`Test the API: curl http://localhost:${port}/test`);
                    resolve(server);
                });

                server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE' && retryCount < 5) {
                        console.log(`Port ${port} is in use, trying port ${port + 1}...`);
                        server.close();
                        resolve(null);
                    } else {
                        reject(error);
                    }
                });
            });

            if (!server && retryCount < 5) {
                return startServer(retryCount + 1);
            }

        } catch (error) {
            if (error.code === 'EADDRINUSE') {
                console.error(`All ports from ${basePort} to ${port} are in use. Please free up a port or specify a different port.`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        }

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer(); 