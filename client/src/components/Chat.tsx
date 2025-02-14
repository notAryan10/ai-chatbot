'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { user } = useUser();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const userMessage = {
            content: inputMessage,
            role: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Log the URL being called
            console.log('Calling API at:', `${process.env.NEXT_PUBLIC_API_URL}/api/messages`);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    content: inputMessage,
                    userId: user?.id 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiMessage = {
                content: data.content,
                role: 'assistant',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error details:', error);
            setMessages(prev => [...prev, {
                content: error.message === 'Failed to fetch' 
                    ? 'Cannot connect to server. Please check if the backend is running.'
                    : error.message || 'Sorry, something went wrong. Please try again.',
                role: 'error',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SignedIn>
                <div className="max-w-4xl mx-auto p-4 pt-16">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="h-[600px] flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg ${
                                                message.role === 'user' 
                                                    ? 'bg-blue-500 text-white rounded-br-none'
                                                    : message.role === 'error'
                                                        ? 'bg-red-500 text-white rounded-bl-none'
                                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                            }`}
                                        >
                                            {message.content}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-200 p-3 rounded-lg rounded-bl-none">
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="border-t p-4">
                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading || !inputMessage.trim()}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <h1 className="text-2xl font-bold mb-4">Please sign in to use the chat</h1>
                    <SignInButton />
                </div>
            </SignedOut>
        </div>
    );
};

export default Chat; 