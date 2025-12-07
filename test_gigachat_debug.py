import os
import sys
import logging
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    from gigachat import GigaChat
    print("GigaChat library imported successfully")
except ImportError:
    print("GigaChat library NOT installed")
    sys.exit(1)

# Credentials from user
credentials = "MDE5YTg2Y2ItNTg0YS03YmJkLTg1MjctZDZmNGI0MDBiZmU3OmZjYTMyZTIwLTJiZGItNDlhMy04Y2E2LTI5ZDRjOWViNmNkNQ=="

print(f"Testing GigaChat with credentials: {credentials[:10]}...")

system_prompt = "Ты полезный помощник."
prompt = "Сгенерируй JSON с полем 'result': 'success'."

try:
    with GigaChat(credentials=credentials, verify_ssl_certs=False, scope="GIGACHAT_API_PERS") as giga:
        print("Authenticating...")
        
        # Construct message payload if needed, or just string concatenation
        # The service code does: f"{system_prompt}\n\n{prompt}"
        chat_message = f"{system_prompt}\n\n{prompt}"
        
        print(f"Sending prompt: {chat_message}")
        response = giga.chat(chat_message)
        
        print("Response received:")
        if response.choices:
            print(response.choices[0].message.content)
        else:
            print("No choices in response")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
