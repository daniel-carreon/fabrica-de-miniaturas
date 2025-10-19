import replicate
import os
import sys

# --- Parámetros de Entrenamiento ---
API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")
DESTINATION_MODEL_OWNER = "daniel-carreon"
# NOTE: This is for TRAINING new models only. Production uses "danielcarreong" model
DESTINATION_MODEL_NAME = "daniel-flux-lora"  # Name for newly trained model
INPUT_IMAGES_PATH = "datos_entrenamiento.zip"
TRIGGER_WORD = "DANI"  # Changed from DANIELC to match current LoRA trigger
LORA_TYPE = "subject"
TRAINER_VERSION = "replicate/fast-flux-trainer:8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed"

def create_destination_model_if_not_exists(owner, name):
    """
    Verifica si un modelo existe en Replicate y, si no, lo crea.
    """
    print(f"Verificando si el modelo {owner}/{name} existe...")
    try:
        replicate.models.get(f"{owner}/{name}")
        print("El modelo ya existe. No es necesario crearlo.")
    except replicate.exceptions.ReplicateError as e:
        if e.status == 404:
            print("El modelo no existe. Creándolo ahora...")
            replicate.models.create(
                owner=owner,
                name=name,
                visibility="public",
                hardware="gpu-t4", # El hardware será sobreescrito por el del trainer
                description=f"Fine-tuned model for subject: {TRIGGER_WORD}"
            )
            print(f"Modelo {owner}/{name} creado con éxito.")
        else:
            # Si es otro error, lo lanzamos
            raise e

def main():
    """
    Función principal para ejecutar el entrenamiento del modelo LoRA en Replicate.
    """
    if not API_TOKEN:
        print("Error: La variable de entorno REPLICATE_API_TOKEN no está configurada.")
        sys.exit(1)

    destination = f"{DESTINATION_MODEL_OWNER}/{DESTINATION_MODEL_NAME}"
    
    try:
        # Paso 1: Crear el modelo si es necesario
        create_destination_model_if_not_exists(DESTINATION_MODEL_OWNER, DESTINATION_MODEL_NAME)

        # Paso 2: Iniciar el entrenamiento
        print(f"\nIniciando el proceso de entrenamiento para el modelo: {destination}")
        print(f"Trigger word: {TRIGGER_WORD}")
        print(f"Archivo de datos: {INPUT_IMAGES_PATH}")

        with open(INPUT_IMAGES_PATH, "rb") as input_images_file:
            training_input = {
                "input_images": input_images_file,
                "trigger_word": TRIGGER_WORD,
                "lora_type": LORA_TYPE,
            }

            print("Enviando la solicitud de entrenamiento a Replicate...")
            training = replicate.trainings.create(
                version=TRAINER_VERSION,
                input=training_input,
                destination=destination
            )

            print("\nEntrenamiento iniciado con éxito.")
            print(f"  ID del Entrenamiento: {training.id}")
            print(f"  Estado: {training.status}")
            print(f"  Puedes ver el progreso en: https://replicate.com/p/{training.id}")

    except FileNotFoundError:
        print(f"Error: No se encontró el archivo de imágenes en la ruta: {INPUT_IMAGES_PATH}")
        sys.exit(1)
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()