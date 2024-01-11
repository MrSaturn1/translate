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
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);

const ffprobeStatic = require('ffprobe-static');
ffmpeg.setFfprobePath(ffprobeStatic.path);
//ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');   // Replace with the actual FFmpeg path
//ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

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

app.get('/config', (req, res) => {
  res.json({ appUrl: process.env.APP_URL || 'http://localhost:3000' });
});

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

app.get("/chat", async (req, res) => {
    const text = req.query.text;
    const language = req.query.language;

    const languagePrompts = {
        "en-US": "You are an assistant fluent in English. Translate the following text into American English.",
        "en-GB": "You are an assistant fluent in English. Translate the following text into British English.",
        "en-AU": "You are an assistant fluent in English. Translate the following text into Australian English.",
        "en-CA": "You are an assistant fluent in English. Translate the following text into Canadian English.",
        "ja-JP": "You are a bilingual assistant fluent in both English and Japanese. Translate the following English text into Japanese.",
        "zh-CN": "You are a bilingual assistant fluent in both English and Chinese. Translate the following English text into Chinese.",
        "de-DE": "You are a bilingual assistant fluent in both English and German. Translate the following English text into German.",
        "hi-IN": "You are a bilingual assistant fluent in both English and Hindi. Translate the following English text into Hindi.",
        "fr-FR": "You are a bilingual assistant fluent in both English and French. Translate the following English text into French.",
        "fr-CA": "You are a bilingual assistant fluent in both English and French. Translate the following English text into Canadian French.",
        "ko-KR": "You are a bilingual assistant fluent in both English and Korean. Translate the following English text into Korean.",
        "pt-BR": "You are a bilingual assistant fluent in both English and Portuguese. Translate the following English text into Brazilian Portuguese.",
        "pt-PT": "You are a bilingual assistant fluent in both English and Portuguese. Translate the following English text into European Portuguese.",
        "it-IT": "You are a bilingual assistant fluent in both English and Italian. Translate the following English text into Italian.",
        "es-ES": "You are a bilingual assistant fluent in both English and Spanish. Translate the following English text into European Spanish.",
        "es-MX": "You are a bilingual assistant fluent in both English and Spanish. Translate the following English text into Mexican Spanish.",
        "id-ID": "You are a bilingual assistant fluent in both English and Indonesian. Translate the following English text into Indonesian.",
        "nl-NL": "You are a bilingual assistant fluent in both English and Dutch. Translate the following English text into Dutch.",
        "tr-TR": "You are a bilingual assistant fluent in both English and Turkish. Translate the following English text into Turkish.",
        "fil-PH": "You are a bilingual assistant fluent in both English and Filipino. Translate the following English text into Filipino.",
        "pl-PL": "You are a bilingual assistant fluent in both English and Polish. Translate the following English text into Polish.",
        "sv-SE": "You are a bilingual assistant fluent in both English and Swedish. Translate the following English text into Swedish.",
        "bg-BG": "You are a bilingual assistant fluent in both English and Bulgarian. Translate the following English text into Bulgarian.",
        "ro-RO": "You are a bilingual assistant fluent in both English and Romanian. Translate the following English text into Romanian.",
        "ar-SA": "You are a bilingual assistant fluent in both English and Arabic. Translate the following English text into Saudi Arabian Arabic.",
        "ar-AE": "You are a bilingual assistant fluent in both English and Arabic. Translate the following English text into UAE Arabic.",
        "cs-CZ": "You are a bilingual assistant fluent in both English and Czech. Translate the following English text into Czech.",
        "el-GR": "You are a bilingual assistant fluent in both English and Greek. Translate the following English text into Greek.",
        "fi-FI": "You are a bilingual assistant fluent in both English and Finnish. Translate the following English text into Finnish.",
        "hr-HR": "You are a bilingual assistant fluent in both English and Croatian. Translate the following English text into Croatian.",
        "ms-MY": "You are a bilingual assistant fluent in both English and Malay. Translate the following English text into Malay.",
        "sk-SK": "You are a bilingual assistant fluent in both English and Slovak. Translate the following English text into Slovak.",
        "da-DK": "You are a bilingual assistant fluent in both English and Danish. Translate the following English text into Danish.",
        "ta-IN": "You are a bilingual assistant fluent in both English and Tamil. Translate the following English text into Tamil.",
        "uk-UA": "You are a bilingual assistant fluent in both English and Ukrainian. Translate the following English text into Ukrainian."
    };


    // Ensure the OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).send({ err: 'No OpenAI API Key set in the .env file' });
    }

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        // Determine the system message based on the selected language
        const systemMessage = languagePrompts[language] || "You are a bilingual assistant. Translate the following English text."; // Default prompt

        const response = await openaiClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemMessage },
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
                //const tempFilePath = path.join(__dirname, 'tempSpeech.mp3');
                const tempFilePath = path.join('/tmp', 'tempSpeech.mp3');
                await writeFileAsync(tempFilePath, buffer);

                // Extract just the format part, ignoring codec details if any
                const outputFormat = req.body.mimeType.split(';')[0].split('/')[1]; // e.g., 'webm' from 'audio/webm;codecs=opus'

                // Convert the file to the desired format
                //const outputFilePath = path.join(__dirname, `outputSpeech.${outputFormat}`); // Change 'webm' to your desired format
                const outputFilePath = path.join('/tmp', `outputSpeech.${outputFormat}`);
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