document.addEventListener('DOMContentLoaded', function() {
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

