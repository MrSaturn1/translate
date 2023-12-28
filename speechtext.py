import speech_recognition as sr
from translate import translate_to_french

def recognize_speech_from_mic(recognizer, microphone):
    with microphone as source:
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        return text
    except sr.RequestError:
        # API was unreachable or unresponsive
        return "API unavailable"
    except sr.UnknownValueError:
        # Speech was unintelligible
        return "Unable to recognize speech"

# Initialize recognizer and microphone
recognizer = sr.Recognizer()
microphone = sr.Microphone()

# Recognize speech
print("Please speak now...")
spoken_text = recognize_speech_from_mic(recognizer, microphone)
print("You said:", spoken_text)

# Now you can use your translate_to_french function
french_translation = translate_to_french(spoken_text, open_api_key)
print("French Translation:", french_translation)
