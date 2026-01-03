
import sys
import os
import argparse
from huggingface_hub import InferenceClient

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["text", "vision"], required=True)
    parser.add_argument("--prompt", type=str) # For text
    parser.add_argument("--image_path", type=str) # For vision (path to temp file)
    args = parser.parse_args()

    token = os.getenv("HF_TOKEN")
    if not token:
        print("Error: No HF_TOKEN")
        sys.exit(1)

    # Use default base_url in 1.3.0.dev0 to let routing work automatically
    client = InferenceClient(token=token)

    try:
        if args.mode == "text":
            model = "meta-llama/Llama-3.1-8B-Instruct"
            # Use chat_completion (conversational) as it is the most widely supported task on the router
            messages = [
                {"role": "system", "content": "You are an expert social media strategist."},
                {"role": "user", "content": args.prompt}
            ]
            response = client.chat_completion(messages=messages, model=model, max_tokens=500)
            print(response.choices[0].message.content)
            
        elif args.mode == "vision":
            model = "Salesforce/blip-image-captioning-large"
            
            # Read image data
            with open(args.image_path, "rb") as f:
                image_data = f.read()
            
            # Final try with root router and image_to_text
            client_vision = InferenceClient(token=token, base_url="https://router.huggingface.co/hf-inference")
            result = client_vision.image_to_text(image_data, model=model)
            
            if isinstance(result, str):
                print(result)
            elif isinstance(result, list) and len(result) > 0:
                 print(result[0].get("generated_text", ""))
            elif isinstance(result, dict):
                 print(result.get("generated_text", ""))
            else:
                 print(str(result))
                 
    except Exception as e:
        import traceback
        print(f"HF Error: {repr(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
