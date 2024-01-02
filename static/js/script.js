let persistentStream;

document.addEventListener('DOMContentLoaded', function() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            persistentStream = stream;
        })
        .catch(error => console.error("Error accessing media devices:", error));
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');
    var recordButton = document.getElementById('record-btn');

    var mediaRecorder;
    var audioChunks = [];

    function getSupportedMimeType() {
        const types = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4'];
        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return null;
    }

    var supportedMimeType = getSupportedMimeType();
    console.log("supportedMimeType: ", supportedMimeType);
    var preferredMimeType;

    function startRecording() {
        console.log("Start Recording")
        if (persistentStream) {
            mediaRecorder = new MediaRecorder(persistentStream, { mimeType: supportedMimeType });
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
                
            };

            mediaRecorder.onstop = () => {
                if (mediaRecorder.mimeType !== '') {
                    preferredMimeType = mediaRecorder.mimeType;
                } else {
                    preferredMimeType = supportedMimeType;
                }
                console.log("preferredMimeType: ", preferredMimeType);
                const audioBlob = new Blob(audioChunks, { type: preferredMimeType });
                sendAudioToServer(audioBlob);
                audioChunks = [];
            };

            mediaRecorder.start();
            recordButton.classList.add('recording');
            recordButton.textContent = 'Recording...';
        } else {
            console.error("No media stream available");
        }
    }

    function stopRecording() {
        console.log("stopRecording function hit")
        if (mediaRecorder) {
            mediaRecorder.stop();
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
        }
    }

    recordButton.addEventListener('mousedown', startRecording);
    recordButton.addEventListener('touchstart', startRecording);
    recordButton.addEventListener('mouseup', stopRecording);
    recordButton.addEventListener('touchend', stopRecording);

    async function sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob);

        try {
            const response = await fetch('https://api.deepgram.com/v1/listen', {
                method: 'POST',
                headers: {
                    'Authorization': 'Token 57974d38cf50497baf7a595f22492df13f615d0e'
                },
                body: formData
            });
            const data = await response.json();
            console.log(data);

            if (data.results && data.results.channels[0].alternatives[0].transcript) {
                const transcript = data.results.channels[0].alternatives[0].transcript;
                console.log(transcript);
                displayMessage(transcript, 'user');
                sendForTranslation(transcript);
            } else {
                console.error('No transcription received');
            }
        } catch (error) {
            console.error('Error sending audio to Deepgram:', error);
        }
    }

    sendButton.addEventListener('click', function() {
        var message = input.value.trim();
        if (message !== '') {
            displayMessage(message, 'user');
            sendForTranslation(message);
            input.value = '';
        }
    });

    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            var message = input.value.trim();
            if (message !== '') {
                displayMessage(message, 'user');
                sendForTranslation(message);
                input.value = '';
            }
        }
    });

    // ... rest of your functions (displayMessage, sendForTranslation, etc.) ...
});

function speak(msg) {

    const status = document.getElementById('status');
    status.innerText = "Speak Pressed: ";

    const text = msg;
    const voiceId = "21m00Tcm4TlvDq8ikWAM";
    const apiKey = '8cbd3d98d91d921ec8a13735e7189f3b';

    status.innerText += "\n"+text;

    const headers = new Headers();
    headers.append('Accept', 'audio/mpeg');
    headers.append('xi-api-key', apiKey);
    headers.append('Content-Type', 'application/json');

    const body = JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
        }
    });

    document.getElementById('status').innerText += '\nProcessing...';

    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: headers,
        body: body
    })
    .then(response => {
        if (response.ok) {
            status.innerText += '\nSpeech successfully generated!';
            return response.blob();
        } else {
            throw new Error('Error: ' + response.statusText);
        }
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => {
            status.innerText += '\nAudio has finished playing!';
        };
    })
    .catch(error => {
        console.error('Error:', error);
        status.innerText += '\nError: ' + error.message;
    });
}

function displayMessage(message, sender) {
    var output = document.getElementById('output');
    var messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.textContent = message;

    if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
        messageDiv.style.backgroundColor = '#d1e8ff';

        /* // Function to handle speech synthesis using Eleven Labs
        var speakMessageWithElevenLabs = function(msg) {
            speak(msg).catch(error => {
                console.error("Error using Eleven Labs Text-to-Speech:", error);
            });
        };*/

        // Automatically read aloud the message when it's from the bot
        speak(message);

        // Additionally, allow the message to be read aloud when clicked
        messageDiv.addEventListener('click', function() {
            speak(this.textContent);
        });
        /*
        // Function to handle speech synthesis
        var speakMessage = function(msg) {
            if (!window.speechSynthesis) {
                console.error("Speech Synthesis API is not supported in this browser.");
                return;
            }
            var utterance = new SpeechSynthesisUtterance(msg);
            utterance.lang = 'fr-FR';
            window.speechSynthesis.speak(utterance);
        };

        // Automatically read aloud the message when it's from the bot
        speakMessage(message);

        // Additionally, allow the message to be read aloud when clicked
        messageDiv.addEventListener('click', function() {
            speakMessage(this.textContent);
        });*/
    }

    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight;
}

function sendForTranslation(text) {
    var url = new URL('http://127.0.0.1:5000/translate');
    //var url = new URL('https://able-rune-409522.wl.r.appspot.com/translate');
    var params = { text: text };
    url.search = new URLSearchParams(params).toString();

    console.log("Request URL:", url.toString());

    fetch(url, { 
        method: 'GET', 
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        console.log("Response received:", response);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log("Data:", data);
        displayMessage(data.translatedText, 'bot');
    })
    .catch((error) => {
        console.error('Error:', error);
        displayMessage('An error occurred while translating', 'bot');
    });
}

