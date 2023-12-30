document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');
    var recordButton = document.getElementById('record-btn');
    var speakButton = document.getElementById('speak-btn');
    var recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    //recognition.continuous = true;
    recognition.interimResults = true;

    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var isRecording = false;
    var completeTranscript = ''; // To keep track of the entire transcript

    recognition.start();

    if (isMobile) {
        recognition.continuous = false
    } else {
        recognition.continuous = true
    }

    // Event listener for mouse down or touch start
    recordButton.addEventListener('mousedown', function() {
        isRecording = true;
        recordButton.classList.add('recording');
        recordButton.textContent = 'Recording...';
        completeTranscript = ''; // Reset the complete transcript for a new recording session
    });
    recordButton.addEventListener('touchstart', function(e) {
        isRecording = true;
        e.preventDefault();
        recordButton.classList.add('recording');
        recordButton.textContent = 'Recording...';
        completeTranscript = ''; // Reset the complete transcript for a new recording session
    });

    // Event listener for mouse up or touch end
    recordButton.addEventListener('mouseup', function() {
        // Delay stopping the recording to capture the end of the speech
        setTimeout(function() {
            isRecording = false;
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
            // Automatically send the transcript after the timeout
            // Call sendMessage only if there is a transcript to send
            if (completeTranscript.trim() !== '') {
               sendMessage(completeTranscript.trim());
            }
        }, 1000); // Adjust this delay as needed
        
    });
    recordButton.addEventListener('touchend', function() {
        // Delay stopping the recording to capture the end of the speech
        setTimeout(function() {
            isRecording = false;
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
            // Automatically send the transcript after the timeout
            // Call sendMessage only if there is a transcript to send
            if (completeTranscript.trim() !== '') {
                sendMessage(completeTranscript.trim());
            }
        }, 1000); // Adjust this delay as needed
    });

    recognition.onresult = function(event) {
        var current = event.resultIndex;
        var transcript = event.results[current][0].transcript;

        if (event.results[current].isFinal) {
            completeTranscript += transcript + ' '; // Append final transcript
        }
    };


    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
    };
/*
    function sendMessage(message) {
        displayMessage(message, 'user');
        sendForTranslation(message);
        input.value = ''; // Clear the input field after sending
    }
*/

    function sendMessage(message) {
        var finalMessage = message || input.value.trim(); // Use provided message or input field value

        if (finalMessage !== '') {
            displayMessage(finalMessage, 'user');
            sendForTranslation(finalMessage);
            input.value = ''; // Clear the input field after sending
        }
    }

    sendButton.addEventListener('click', function() {
        sendMessage();
    });

    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // ... rest of your functions (displayMessage, sendForTranslation, etc.)
});

/*function displayMessage(message, sender) {
    var output = document.getElementById('output');
    var messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.textContent = message;
    if (sender === 'bot') {
        messageDiv.style.backgroundColor = '#d1e8ff';
        if (!window.speechSynthesis) {
            console.error("Speech Synthesis API is not supported in this browser.");
            return;
        }

        // Automatically read aloud the message
        var utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR'; // Set to the language of the translation

        utterance.onerror = function(event) {
            console.error("Speech Synthesis error:", event.error);
        };

        window.speechSynthesis.speak(utterance)

        // Add click event listener for reading the message aloud
        messageDiv.addEventListener('click', function() {
            var utterance = new SpeechSynthesisUtterance(this.textContent);
            utterance.lang = 'fr-FR'; // Set to the language of the translation
            window.speechSynthesis.speak(utterance);
        });
    }
    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight;
}*/

function displayMessage(message, sender) {
    var output = document.getElementById('output');
    var messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.textContent = message;

    if (sender === 'bot') {
        messageDiv.classList.add('bot-message'); // Add 'bot' class for styling
        messageDiv.style.backgroundColor = '#d1e8ff';

        var readMessageAloud = function(msg) {
            if (!window.speechSynthesis) {
                console.error("Speech Synthesis API is not supported in this browser.");
                return;
            }
            var utterance = new SpeechSynthesisUtterance(msg);
            utterance.lang = 'fr-FR';
            utterance.onerror = function(event) {
                console.error("Speech Synthesis error:", event.error);
            };
            window.speechSynthesis.speak(utterance);
        };

        // Automatically read aloud the message and set up click event for reading aloud
        readMessageAloud(message);
        messageDiv.addEventListener('click', function() {
            readMessageAloud(this.textContent);
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

