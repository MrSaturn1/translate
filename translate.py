from openai import OpenAI
import os

#automatically imports OpenAI API key from environment variable OPEN_API_KEY
client = OpenAI()

def translate_to_french(text):
    try:
        response = client.chat.completions.create(model="gpt-3.5-turbo",
        messages= [
        {"role": "system", "content": "You are a billingual assistant fluent in both English and French. Translate the following English text into French."},
        {"role": "user", "content": text}
        ]
        ,
        max_tokens=60)

        translation = response.choices[0].message.content
        return translation
    except Exception as e:
        print("An error occurred:", e)
        return None

 