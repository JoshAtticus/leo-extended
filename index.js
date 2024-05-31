const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

require('dotenv').config();

const app = express();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "You're Leo Trends, you'll receive the current page of posts on Meower and summarise it into dot points. Don't use markdown or HTML. Include usernames of people participating in discussions. Posts from 'Discord' are not actually Discord. Look at the post content instead and look for the username before the : (for example a post from Discord with the content 'JoshAtticus: hello' is actually a post from JoshAtticus sent from the Discord bridge). Keep it really, *really*, short, group everything into topics! For example if 2 or more people are talking about the same thing, say for example 'Josh and eri are talking about Atticus'",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function fetchMeowerData() {
    try {
        const response = await axios.get('https://api.meower.org/home?autoget=1');
        return response.data;
    } catch (error) {
        console.error('Error fetching Meower data:', error);
        throw error;
    }
}

async function summarizeData(data) {
    const chatSession = model.startChat({ generationConfig, safetySettings, history: [
        { role: "user", parts: [{ text: JSON.stringify(data) }] },
    ]});

    const result = await chatSession.sendMessage("Summarize the Meower posts data.");
    return result.response.text();
}

app.get('/', (req, res) => {
    res.send("Hello, World! You've reached the root path of the leo extended features server. There's nothing here.");
});

app.get('/ai/trending', async (req, res) => {
    try {
        const meowerData = await fetchMeowerData();
        const summary = await summarizeData(meowerData);
        res.send(summary);
    } catch (error) {
        res.status(500).send('Ruh roh, error!\n\n' + error);
    }
});

const server = app.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});
