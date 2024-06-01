// node --version # Should be >= 18
// npm install @google/generative-ai express axios dotenv

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

require('dotenv').config();

const app = express();
app.use(cors());
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_NAME = "gemini-1.5-pro";

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

let cachedSummary = '';

async function fetchMeowerData() {
    try {
        const response = await axios.get('https://api.meower.org/home?autoget=1');
        return response.data;
    } catch (error) {
        console.error('Error fetching Meower data:', error);
        throw error;
    }
}

function extractRelevantData(data) {
    return data.autoget.map(post => {
        let username = post.u;
        let content = post.p;

        if (username === 'Discord' || username === 'Revower' || username === 'revolt') {
            const colonIndex = content.indexOf(':');
            if (colonIndex !== -1) {
                username = content.substring(0, colonIndex);
                content = content.substring(colonIndex + 1).trim();
            }
        }

        return { username, content };
    });
}

async function summarizeData(data) {
    const relevantData = extractRelevantData(data);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const parts = [
        {text: "You're Leo Trending, you'll receive the current page of posts on Meower and summarise it into dot points. Don't use markdown or HTML. Include usernames of people participating in discussions. \n\nPosts from 'Discord' are not actually Discord. Look at the post content instead and look for the username before the : (for example a post from Discord with the content 'JoshAtticus: hello' is actually a post from JoshAtticus sent from the Discord bridge). Keep it really, *really*, short, group everything into topics! For example if 2 or more people are talking about the same thing, say for example 'Josh and eri are talking about Atticus'.\n\ntrends should be single words separated by commas. list should be the dot points from earlier. Always include @ before usernames. Below is a simple example of what you'll recieve and how you should respond. Don't take any information from it." },
        {text: "input: [\n  {\n    username: '-gr',\n    content: 'oh i had to open terminal and do `sudo ./xampp-installer.run`'\n  },\n  { username: '-gr', content: 'HOW DO I BECOME SUPERUSER' },\n  {\n    username: 'Supernoodles99',\n    content: \"#that's #a #lot #of #hashtags\"\n  },\n  {\n    username: '-gr',\n    content: 'I just got #XAMPP from @ApacheFriends https://www.apachefriends.org #opensource.'\n  },\n  {\n    username: 'Supernoodles99',\n    content: 'https://eris.pages.dev/meo/about/ is really cool'\n  },\n  { username: 'Supernoodles99', content: '' },\n  {\n    username: 'Supernoodles99',\n    content: 'when i click the share button on a post it goes to meo-32r <:toasty:1227089807897792605>'\n  },\n  { username: 'Supernoodles99', content: '' },\n  {\n    username: 'Tnix',\n    content: '@Supernoodles99 \"meo is very cool ...\" (9ef42ad2-2df1-4fae-854a-ac7a4620cc98)\\n' +\n      '<:yuhhuh:1227268820213698611>'\n  },\n  {\n    username: 'JoshAtticus',\n    content: 'https://uploads.meower.org/attachments/O1UuAnWc6wxHDSINDRGX9n0f/PXL_20240531_234553898.RAW-01.COVER.jpg'\n  },\n  {\n    username: 'Supernoodles99',\n    content: 'meo is very cool <:yuhhuh:1227268820213698611>'\n  },\n  { username: 'Supernoodles99', content: 'uhh' },\n  { username: 'Supernoodles99', content: 'eris' },\n  { username: 'JoshAtticus', content: 'atticus my beloved' },\n  {\n    username: 'Souple',\n    content: '@Supernoodles99 \"i have never heard of either of those\" (17e9e443-88d9-44db-b30f-7e644f4b5054)\\n' +\n      \"you're missing out :D\"\n  },\n  {\n    username: 'Supernoodles99',\n    content: 'i have never heard of either of those'\n  },\n  {\n    username: 'Souple',\n    content: 'What should I watch first :/\\nLab Rats or Even Stevens :/'\n  },\n  {\n    username: 'Supernoodles99',\n    content: 'also the company behind it is just shady in general'\n  },\n  { username: 'Eris', content: 'Opera how low you’ve sunk' },\n  {\n    username: 'Supernoodles99',\n    content: 'https://www.youtube.com/watch?v=KT0KmjYrSzA'\n  },\n  {\n    username: 'Eris',\n    content: 'https://tenor.com/view/fuck-you-finger-middle-kitty-gif-12313082'\n  },\n  {\n    username: 'Souple',\n    content: 'when your fav disney show ends 😭😭😭😭'\n  },\n  { username: 'Eris', content: 'Probably' },\n  { username: 'Supernoodles99', content: 'hollup lemme find it' },\n  {\n    username: 'Supernoodles99',\n    content: 'i remember seeing some yt video on it'\n  }\n]"},
        {text: "output: {\"list\": \"- @-gr is trying to become superuser.\\n- @Supernoodles99 and @Tnix think meo is cool. @Supernoodles99 found a bug with the share button.\\n- @JoshAtticus posted an image.\\n- @JoshAtticus and @Supernoodles99 are talking about Atticus.\\n- @Souple is deciding on what to watch: Lab Rats or Even Stevens. @Supernoodles99 is participating in the discussion. \\n- @Eris posted about Opera.\\n- @Supernoodles99 and @Eris are talking about a Youtube video. \\n- @Souple is sad about their favourite Disney show ending. @Eris replies.\", \"trends\": \"superuser, hashtags, apache, meo, atticus, opera\"}"},
        {text: "input: " + JSON.stringify(relevantData) }
    ];

    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
        safetySettings,
    });

    return result.response.text();
}

let previousMeowerData = null;

async function updateSummaryCache() {
    console.log("Updating summary cache...")
    try {
        const meowerData = await fetchMeowerData();
        if (JSON.stringify(meowerData) !== JSON.stringify(previousMeowerData)) {
            cachedSummary = await summarizeData(meowerData);
            console.log('Summary cache updated.');
            previousMeowerData = meowerData;
        } else {
            console.log('Data is the same as before, no need to resummarize.');
        }
    } catch (error) {
        console.error('Error updating summary cache:', error);
    }
}

app.get('/', (req, res) => {
    res.send("Hello, World! You've reached the root path of the leo extended features server. There's nothing here.");
});

app.get('/ai/trending', (req, res) => {
    res.send(cachedSummary || 'Summary not available yet, please try again in a few moments.');
});

const server = app.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
    updateSummaryCache(); // Generate initial summary
    setInterval(updateSummaryCache, 30000); // Update summary every 30 seconds
});
