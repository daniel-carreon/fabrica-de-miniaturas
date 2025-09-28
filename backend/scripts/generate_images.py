
import replicate
import os
import sys
import requests
from PIL import Image
from io import BytesIO
import argparse

# --- Parámetros (se pueden sobreescribir con argumentos de línea de comandos) ---
# Usamos os.getenv para leer las variables de entorno
from dotenv import load_dotenv
load_dotenv()

API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
MODEL_VERSION = f"{os.getenv('DEFAULT_MODEL')}:{os.getenv('DEFAULT_VERSION')}"
TRIGGER_WORD = os.getenv("TRIGGER_WORD", "USER")

# --- Prompt Base y Variaciones ---
BASE_PROMPT = f"Medium close-up shot of {TRIGGER_WORD}, framed from the chest up, for a YouTube thumbnail about AI technology. He is wearing a smart, professional blazer. The background is a modern, minimalist tech office. The image is ultra-sharp, 8k, with cinematic, dramatic lighting."
PROMPTS = [
    BASE_PROMPT + " He is smiling confidently at the camera.",
    BASE_PROMPT + " He is smiling, with one hand raised in a gesturing motion, as if explaining a concept.",
    BASE_PROMPT + " He is smiling, looking slightly away from the camera with a thoughtful expression.",
    BASE_PROMPT + " He is smiling, leaning slightly forward over a desk with a background of blurred code.",
    BASE_PROMPT + " He is smiling warmly, with a soft, approachable look.",
    BASE_PROMPT + " He has a serious, focused expression, looking directly at the camera.",
    BASE_PROMPT + " He has a thoughtful expression, with his hand on his chin.",
    BASE_PROMPT + " He has a neutral, authoritative expression, with arms crossed.",
    BASE_PROMPT + " He has a serious expression, looking at a glowing abstract UI element floating in front of him.",
    BASE_PROMPT + " He has a mysterious, pensive expression, with dramatic key lighting from one side."
]

def download_and_convert_image(url, output_path):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        if image.mode in ("RGBA", "P"): 
            image = image.convert("RGB")
        image.save(output_path, "jpeg", quality=95)
        print(f"Imagen guardada en: {output_path}")
    except Exception as e:
        print(f"Error al descargar o convertir la imagen {url}: {e}")

def main(output_dir):
    if not API_TOKEN:
        print("Error: La variable de entorno REPLICATE_API_TOKEN no está configurada.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    print(f"Guardando imágenes en: {output_dir}")

    for i, prompt in enumerate(PROMPTS):
        image_number = i + 1
        print(f"\n--- Generando imagen {image_number} de {len(PROMPTS)} ---")
        print(f"Prompt: {prompt}")
        try:
            output = replicate.run(MODEL_VERSION, input={"prompt": prompt})
            if output and isinstance(output, list) and len(output) > 0:
                image_url = output[0]
                file_name = f"thumbnail_ai_{image_number}.jpg"
                output_path = os.path.join(output_dir, file_name)
                download_and_convert_image(image_url, output_path)
            else:
                print("La API no devolvió una URL de imagen válida.")
        except Exception as e:
            print(f"Ocurrió un error al generar la imagen: {e}", file=sys.stderr)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera una tanda de imágenes usando un modelo de Replicate.")
    parser.add_argument("--output", type=str, default="output/generacion_ai_thumbnail", help="Directorio donde se guardarán las imágenes generadas.")
    args = parser.parse_args()
    main(args.output)
