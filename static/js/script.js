let persistentStream;
var preferredMimeType;

let appUrl='http://localhost:3000';

fetch('/config')
  .then(response => response.json())
  .then(config => {
    appUrl = config.appUrl;
  });

console.log("appUrl: ", appUrl)

document.addEventListener('DOMContentLoaded', function() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            persistentStream = stream;
        })
        .catch(error => console.error("Error accessing media devices:", error));
    var input = document.querySelector('#chat-input');
    var sendButton = document.querySelector('#send-btn');
    const recordButton = document.querySelector('.record-btn');
    var languageSelector = document.getElementById('language-selector');

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
                const audioUrl = URL.createObjectURL(audioBlob); // Define audioUrl here

                const recordingAudio = new Audio(audioUrl);
                //console.log('Playing back initial recorded audio');
                //recordingAudio.play().catch(e => console.error('Error playing audio:', e));

                sendAudioToServer(audioBlob);
                audioChunks = [];
            };

            mediaRecorder.start();
            recordButton.classList.add('recording');
            //recordButton.textContent = 'Recording...';
        } else {
            console.error("No media stream available");
        }
    }

    function stopRecording() {
        console.log("stopRecording function hit")
        if (mediaRecorder) {
            mediaRecorder.stop();
            recordButton.classList.remove('recording');
            //recordButton.textContent = 'Record';
        }
    }

    recordButton.addEventListener('mousedown', startRecording);
    recordButton.addEventListener('touchstart', startRecording);
    recordButton.addEventListener('mouseup', stopRecording);
    recordButton.addEventListener('touchend', stopRecording);

    async function sendAudioToServer(audioBlob) {
        console.log('Audio Blob:', audioBlob.size, audioBlob.type);
        const formData = new FormData();
        formData.append('audioBlob', audioBlob, preferredMimeType);

        try {
            const response = await fetch(`${appUrl}/sendAudioToServer`, {
                method: 'POST',
                //headers: {
                    //'Content-Type': 'application/json'
                    //'Authorization': 'Token 57974d38cf50497baf7a595f22492df13f615d0e'
                    //'Authorization': 'Token ' + process.env.DEEPGRAM_API_KEY
                //},
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Transcription: ', data);

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

    const rVoiceId = "21m00Tcm4TlvDq8ikWAM";

    function speak(text, voiceId, mimeType) {
        console.log("Sending to /speak:", { text, voiceId, mimeType });

        fetch(`${appUrl}/speak`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, voiceId, mimeType })
        })
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                throw new Error('Network response was not ok');
            }
        })
        .then(blob => {
            console.log('Received audio blob for translated text:', blob);

            if (blob.size > 1024) {  // Example size check, adjust as needed
                const url = window.URL.createObjectURL(blob);
                const playbackAudio = new Audio(url);
                console.log('Playing back audio from /speak endpoint');
                playbackAudio.play().catch(e => console.error('Error playing audio from /speak:', e));
            } else {
                console.error('Error: Received audio blob is too small');
            }

            //const url = window.URL.createObjectURL(blob);
            //const playbackAudio = new Audio(url);
            //console.log('Playing back audio from /speak endpoint');
            //playbackAudio.play().catch(e => console.error('Error playing audio from /speak:', e));
        })
        .catch(error => {
            console.error('Error:', error);
            // Error handling
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

            // Automatically read aloud the message when it's from the bot
            speak(message, rVoiceId, preferredMimeType);

            // Additionally, allow the message to be read aloud when clicked
            messageDiv.addEventListener('click', function() {
                speak(this.textContent, rVoiceId, preferredMimeType);
            });
        }

        output.appendChild(messageDiv);
        output.scrollTop = output.scrollHeight;
    }

    function sendForTranslation(text) {
        var selectedLanguage = languageSelector.value; // Get the selected language code

        var url = new URL(`${appUrl}/chat`);
        //var url = new URL('https://able-rune-409522.wl.r.appspot.com/translate');
        var params = { text: text, language: selectedLanguage };
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
            if (data.translation) {
                displayMessage(data.translation, 'bot');
            } else {
                console.error('No translation received');
                displayMessage('No translation received', 'bot');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            displayMessage('An error occurred while translating', 'bot');
        });
    }
});
