require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
console.log("Deepgram API Key:", process.env.DEEPGRAM_API_KEY);

const ffmpeg = require('fluent-ffmpeg');

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

async function setupServer() {
    const fetch = (await import('node-fetch')).default;    
    const upload = multer({ storage: multer.memoryStorage() });
    const app = express();
    const fs = require('fs');
    const path = require('path');
    const { promisify } = require('util');
    const writeFileAsync = promisify(fs.writeFile);
    const readFileAsync = promisify(fs.readFile);
    const unlinkAsync = promisify(fs.unlink);  // For file deletion

    app.use(cors());

    const PORT = process.env.PORT || 3000;

    app.use(express.static('static'));
    app.use(express.json());

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

    app.post('/speak', async (req, res) => {
        const text = req.body.text;
        const voiceId = req.body.voiceId;
        const mimeType = req.body.mimeType

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

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
                throw new Error('Error from ElevenLabs API');
            }
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Server Error');
        }
    });

    
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

setupServer().catch(error => console.error('Failed to start the server:', error));
