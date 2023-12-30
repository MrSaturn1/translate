document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');
    var recordButton = document.getElementById('record-btn'); // Get the record button
    var speakButton = document.getElementById('speak-btn'); // Get the speak butto
    var recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";

    // Function to handle the speech synthesis
    speakButton.addEventListener('click', function() {
        var textToRead = document.getElementById('output').textContent;
        if (textToRead) {
            var utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.lang = 'fr-FR'; // Set to French
            window.speechSynthesis.speak(utterance);
        }
    });

    function toggleRecording() {
        if (recordButton.classList.contains('recording')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    recognition.onstart = function() {
        recordButton.classList.add('recording');
        recordButton.textContent = 'Recording...';
    };

    recognition.onend = function() {
        recordButton.classList.remove('recording');
        recordButton.textContent = 'Record';
    };

    recognition.onresult = function(event) {
        var text = event.results[0][0].transcript;
        input.value = text;
        recognition.stop();
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        recordButton.classList.remove('recording');
        recordButton.textContent = 'Record';
    };

    recordButton.addEventListener('click', toggleRecording);

    function sendMessage() {
        var message = input.value.trim();
        input.value = '';

        if (message !== '') {
            displayMessage(message, 'user');
            setTimeout(function() {
                sendForTranslation(message);
            }, 1000);
        }
    }

    sendButton.addEventListener('click', sendMessage);

    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // ... rest of your functions (displayMessage, sendForTranslation, etc.)
});

function displayMessage(message, sender) {
    var output = document.getElementById('output');
    var messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.textContent = message;
    if (sender === 'bot') {
        messageDiv.style.backgroundColor = '#d1e8ff';

        // Add click event listener for reading the message aloud
        messageDiv.addEventListener('click', function() {
            var utterance = new SpeechSynthesisUtterance(this.textContent);
            utterance.lang = 'fr-FR'; // Set to the language of the translation
            window.speechSynthesis.speak(utterance);
        });
    }
    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight;
}

function sendForTranslation(text) {
    //var url = new URL('http://127.0.0.1:5000/translate');
    var url = new URL('https://able-rune-409522.wl.r.appspot.com/translate');
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

