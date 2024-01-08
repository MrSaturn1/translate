require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');

// Set FFmpeg paths
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');   // Replace with the actual FFmpeg path
ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

function convertToMp3(inputPath, outputPath, callback) {
    ffmpeg(inputPath)
        .output(outputPath)
        .toFormat('mp3')
        .on('end', () => callback(null))
        .on('error', (err) => callback(err))
        .run();
}

function convertFromMp3(inputPath, outputPath, format, callback) {
    ffmpeg(inputPath)
        .output(outputPath)
        .toFormat(format)
        .on('end', () => callback(null))
        .on('error', (err) => callback(err))
        .run();
}

// Initialize express app
const app = express();
app.use(cors());
app.use(express.static('static'));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);  // For file deletion

const PORT = process.env.PORT || 3000;

app.post('/sendAudioToServer', upload.single('audioBlob'), async (req, res) => {
    //const audioBlob = req.file; // Adjust according to your data structure
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Extract the buffer from req.file
    const audioBuffer = req.file.buffer; // This is the actual audio data

    // Replace with your actual API endpoint and key
    const apiUrl = 'https://api.deepgram.com/v1/listen';
    const dgApiKey = process.env.DEEPGRAM_API_KEY;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${dgApiKey}`,
                'Content-Type': req.file.mimetype // Set the correct content type
            },
            body: audioBuffer
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data); // Sending the response back to the client
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

/*app.get('/chat', async (req, res) => {
    const text = req.query.text;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    try {
        const response = await fetch('https://api.openai.com/v1/engines/gpt-3.5-turbo/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: `Translate this to French: ${text}`,
                max_tokens: 60,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const translation = data.choices[0].text;
        res.json({ translatedText: translation });
    } catch (error) {
        console.error('Translation Error:', error);
        res.status(500).send('Server Error');
    }
});*/

app.get("/chat", async (req, res) => {
    const text = req.query.text;

    // Ensure the OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).send({ err: 'No OpenAI API Key set in the .env file' });
    }

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const response = await openaiClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a bilingual assistant fluent in both English and French. Translate the following English text into French." },
                { role: "user", content: text }
            ],
            max_tokens: 60
        });

        console.log("API Response: ", response);

        const translation = response.choices[0].message.content;
        res.send({ translation });
        //res.send(response);
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).send({ err: error.message || error });
    }
});

app.post('/speak', async (req, res) => {
    const text = req.body.text;
    const voiceId = req.body.voiceId;
    const mimeType = req.body.mimeType

    console.log("Received /speak request:", req.body);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    
    console.log("Making request to ElevenLabs API:", { apiUrl, apiKey, text, voiceId });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                //'Accept': mimeType,
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            console.log('Received blob from ElevenLabs:', blob);

            // Only proceed if the blob size is reasonable for an audio file
            if (blob.size > 1024) {  // Example size check, adjust as needed
                const buffer = Buffer.from(await blob.arrayBuffer());
                const tempFilePath = path.join(__dirname, 'tempSpeech.mp3');
                await writeFileAsync(tempFilePath, buffer);

                // Extract just the format part, ignoring codec details if any
                const outputFormat = req.body.mimeType.split(';')[0].split('/')[1]; // e.g., 'webm' from 'audio/webm;codecs=opus'

                // Convert the file to the desired format
                const outputFilePath = path.join(__dirname, `outputSpeech.${outputFormat}`); // Change 'webm' to your desired format
                await new Promise((resolve, reject) => {
                    convertFromMp3(tempFilePath, outputFilePath, outputFormat, (err) => { // Change 'webm' to your desired format
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Read the converted file and send it to the client
                const convertedBuffer = await readFileAsync(outputFilePath);
                res.setHeader('Content-Type', req.body.mimeType);
                res.send(convertedBuffer);

                // Cleanup temporary files
                await unlinkAsync(tempFilePath);
                await unlinkAsync(outputFilePath);

            } else {
                console.error('Error: Received audio blob is too small');
                res.status(500).send('Server Error: Audio blob is too small');

                // Cleanup in case of errors
                await unlinkAsync(tempFilePath).catch(() => {});
                await unlinkAsync(outputFilePath).catch(() => {});
            }
        } else {
            throw new Error('Error from ElevenLabs API, response not ok');
            res.status(500).send('Server Error: ' + (error.message || error));
        }
    } catch (error) {
        console.error('Error in /speak:', error);
        res.status(500).send('Server Error');
    }
});

    
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});