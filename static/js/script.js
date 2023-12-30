document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('chat-input');
    var sendButton = document.getElementById('send-btn');
    var recordButton = document.getElementById('record-btn');
    var speakButton = document.getElementById('speak-btn');
    var recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    var isRecording = false;
    var completeTranscript = ''; // To keep track of the entire transcript

    recognition.start();

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
        }, 1000); // Adjust this delay as needed
        
    });
    recordButton.addEventListener('touchend', function() {
        // Delay stopping the recording to capture the end of the speech
        setTimeout(function() {
            isRecording = false;
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Record';
        }, 1000); // Adjust this delay as needed
    });

    recognition.onresult = function(event) {
        if (isRecording) {
            var current = event.resultIndex;
            var transcript = event.results[current][0].transcript;

            if (event.results[current].isFinal) {
                completeTranscript += transcript + ' '; // Add final transcript to complete transcript
                input.value = completeTranscript; // Update input with complete transcript
            } else {
                // Calculate the new part of the interim result
                var newInterimPart = transcript.substring(completeTranscript.length);
                input.value = completeTranscript + newInterimPart; // Update input with new interim part
            }
        }
    };


    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
    };

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

        // Automatically read aloud the message
        var utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR'; // Set to the language of the translation
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

