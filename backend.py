from flask import Flask, request, jsonify, url_for, render_template
from translate import translate_to_french # Replace with your module and function
import os
from flask_cors import CORS, cross_origin


open_api_key = os.environ.get('OPENAI_API_KEY')
#handle a POST request
app = Flask(__name__)
CORS(app)


@app.route('/translate', methods=['GET', 'POST'])
@cross_origin()
def translate_text():
    if request.method == 'POST':
        data = request.json
        english_text = data.get('text')
    else:
        english_text = request.args.get('text')

    print("English text: ", english_text)
    french_text = translate_to_french(english_text, open_api_key)
    print("French text: ", french_text)

    return jsonify({'translatedText': french_text})

@app.route("/")
def index():
    return "Congratulations, it's a web app!"


if __name__ == '__main__':
    app.run(debug=True )

