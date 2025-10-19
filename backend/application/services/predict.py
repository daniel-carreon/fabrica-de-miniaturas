
import replicate
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# --- Parámetros de Predicción ---
API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")
# Use environment variables instead of hardcoded model (防止使用旧模型)
MODEL_NAME = os.getenv("NEXT_PUBLIC_MODEL_NAME", "daniel-carreon/danielcarreong")
MODEL_VERSION = os.getenv("NEXT_PUBLIC_MODEL_VERSION", "56c9356f9c4f271e294b8533b398f318881f02e1568e4733fc6cacfad1a759bc")
MODEL_FULL = f"{MODEL_NAME}:{MODEL_VERSION}"

# Prompt diseñado para una miniatura de YouTube de alta calidad
PROMPT = "Close-up photo of DANI with a surprised and excited expression, perfect for a YouTube thumbnail. Dramatic, vibrant studio lighting. Ultra sharp, 8k resolution, incredibly high detail, professional photography."

def main():
    """
    Función principal para generar una imagen con el modelo fine-tuned.
    """
    if not API_TOKEN:
        print("Error: La variable de entorno REPLICATE_API_TOKEN no está configurada.")
        sys.exit(1)

    print("Enviando la solicitud de predicción a Replicate...")
    print(f"Prompt: {PROMPT}")

    try:
        output = replicate.run(
            MODEL_FULL,
            input={"prompt": PROMPT}
        )

        print("\n¡Imagen generada con éxito!")
        print("URL de la imagen:")
        # La salida es una lista, imprimimos el primer elemento
        if isinstance(output, list) and len(output) > 0:
            print(output[0])
        else:
            print(output)

    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
