from flask import Flask, request, jsonify, url_for, render_template
from translate import translate_to_french # Replace with your module and function
import os
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/translate', methods=['GET', 'POST'])
@cross_origin()
def translate_text():
    if request.method == 'POST':
        data = request.json
        english_text = data.get('text')
    else:
        english_text = request.args.get('text')
    french_text = translate_to_french(english_text)

    return jsonify({'translatedText': french_text})

@app.route("/test")
def index():
    return "Congratulations, it's a web app!"

if __name__ == '__main__':
    app.run(debug=True)