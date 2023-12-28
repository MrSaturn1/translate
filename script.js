/*document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');

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
});

// Add a button for speech recognition in your HTML
// <button id="record-btn">Record</button>

document.getElementById('record-btn').addEventListener('click', function() {
    var button = this;
    var recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = function() {
        button.classList.add('recording'); // Start recording: change to green
        button.textContent = 'Recording...'; // Optional: change text
    };

    recognition.onend = function() {
        button.classList.remove('recording'); // Stop recording: back to red
        button.textContent = 'Record'; // Optional: reset text
    };

    recognition.onresult = function(event) {
        var text = event.results[0][0].transcript;
        document.getElementById('chat-input').value = text;
        recognition.stop(); // Stop recognition
    }

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        recognition.stop(); // Stop recognition on error
    }

    recognition.start();
});*/

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');
    var recordButton = document.getElementById('record-btn'); // Get the record button
    var recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";

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
    }
    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight;
}

function sendForTranslation(text) {
    var url = new URL('http://127.0.0.1:5000/translate');
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

