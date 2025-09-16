#!/usr/bin/env python3
"""
🎯 REAL FLUX Fine-Tuning Script - Daniel Flux Context
Script para entrenar un modelo FLUX personalizado usando Replicate API
con las 65 imágenes comprimidas de Daniel para reconocimiento facial.
"""

import os
import sys
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any
import replicate
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('real_training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class RealFluxTrainer:
    """Real FLUX Training Pipeline using Replicate API"""

    def __init__(self):
        # Load environment variables
        load_dotenv()

        # Initialize Replicate client
        api_token = os.getenv("REPLICATE_API_TOKEN")
        if not api_token:
            raise ValueError("❌ REPLICATE_API_TOKEN not found in environment")

        self.client = replicate.Client(api_token=api_token)
        self.training_zip = "training_data.zip"

        # Training configuration
        self.config = {
            "trigger_word": "DANI",
            "resolution": 1024,
            "train_batch_size": 1,
            "num_train_epochs": 10,
            "max_train_steps": 1000,
            "learning_rate": 1e-4,
            "lr_scheduler": "constant",
            "seed": 42,
            "guidance_scale": 3.5
        }

        logger.info("✅ Real FLUX Trainer initialized")

    def verify_dataset(self) -> bool:
        """Verify training dataset exists"""
        if not Path(self.training_zip).exists():
            logger.error(f"❌ Training dataset not found: {self.training_zip}")
            return False

        size_mb = Path(self.training_zip).stat().st_size / 1024 / 1024
        logger.info(f"✅ Training dataset found: {self.training_zip} ({size_mb:.1f}MB)")
        return True

    def upload_dataset(self) -> str:
        """Upload training dataset to Replicate and get URL"""
        logger.info("📤 Uploading training dataset to Replicate...")

        try:
            # Upload file to Replicate
            with open(self.training_zip, 'rb') as f:
                file_url = self.client.files.create(f)

            logger.info(f"✅ Dataset uploaded successfully: {file_url}")
            return file_url

        except Exception as e:
            logger.error(f"❌ Failed to upload dataset: {e}")
            raise

    def start_training(self, dataset_url: str) -> Any:
        """Start FLUX fine-tuning on Replicate"""
        logger.info("🚀 Starting REAL FLUX fine-tuning...")

        try:
            # Use FLUX.1 [dev] LoRA training - Fixed URL format
            dataset_file_url = dataset_url.urls['get'] if hasattr(dataset_url, 'urls') else str(dataset_url)

            training = self.client.trainings.create(
                version="ostris/flux-dev-lora-trainer:e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497",
                input={
                    "input_images": dataset_file_url,
                    "trigger_word": self.config["trigger_word"],
                    "resolution": self.config["resolution"],
                    "train_batch_size": self.config["train_batch_size"],
                    "num_train_epochs": self.config["num_train_epochs"],
                    "max_train_steps": self.config["max_train_steps"],
                    "learning_rate": self.config["learning_rate"],
                    "lr_scheduler": self.config["lr_scheduler"],
                    "seed": self.config["seed"],
                    "guidance_scale": self.config["guidance_scale"]
                },
                destination=f"danielcarreon/flux-dani-kontext"
            )

            logger.info(f"✅ Training started successfully!")
            logger.info(f"🆔 Training ID: {training.id}")
            logger.info(f"📋 Training URL: https://replicate.com/p/{training.id}")

            return training

        except Exception as e:
            logger.error(f"❌ Failed to start training: {e}")
            raise

    def monitor_training(self, training) -> str:
        """Monitor training progress and return final model URL"""
        logger.info(f"👀 Monitoring training progress: {training.id}")

        try:
            # Poll training status
            while training.status in ["starting", "processing"]:
                training.reload()
                logger.info(f"📊 Training status: {training.status}")

                if hasattr(training, 'logs') and training.logs:
                    # Show latest log entries
                    log_lines = training.logs.split('\n')[-3:]
                    for line in log_lines:
                        if line.strip():
                            logger.info(f"📝 {line.strip()}")

                time.sleep(30)  # Check every 30 seconds

            if training.status == "succeeded":
                logger.info("🎉 Training completed successfully!")
                model_url = f"danielcarreon/flux-dani-context"
                logger.info(f"🎯 Model available at: {model_url}")
                return model_url
            else:
                logger.error(f"❌ Training failed with status: {training.status}")
                if hasattr(training, 'error'):
                    logger.error(f"❌ Error details: {training.error}")
                raise Exception(f"Training failed: {training.status}")

        except Exception as e:
            logger.error(f"❌ Error monitoring training: {e}")
            raise

    def test_trained_model(self, model_url: str) -> None:
        """Test the trained model with sample prompts"""
        logger.info(f"🧪 Testing trained model: {model_url}")

        test_prompts = [
            "DANI portrait for tech review thumbnail",
            "DANI professional headshot for LinkedIn",
            "DANI content creator photo for YouTube",
            "DANI in a modern office setting"
        ]

        try:
            for i, prompt in enumerate(test_prompts, 1):
                logger.info(f"🎨 Generating test image {i}: '{prompt}'")

                # Generate image with trained model
                output = self.client.run(
                    f"{model_url}:latest",
                    input={
                        "prompt": prompt,
                        "guidance_scale": 3.5,
                        "num_inference_steps": 28,
                        "seed": 42
                    }
                )

                if output:
                    logger.info(f"✅ Test image {i} generated: {output[0] if isinstance(output, list) else output}")
                else:
                    logger.warning(f"⚠️ No output for test image {i}")

                time.sleep(2)  # Rate limiting

        except Exception as e:
            logger.error(f"❌ Error testing model: {e}")

    def run_real_training(self) -> str:
        """Run the complete REAL training pipeline"""
        try:
            logger.info("🎯 Starting REAL FLUX fine-tuning pipeline...")

            # Step 1: Verify dataset
            if not self.verify_dataset():
                raise Exception("Training dataset verification failed")

            # Step 2: Upload dataset
            dataset_url = self.upload_dataset()

            # Step 3: Start training
            training = self.start_training(dataset_url)

            # Step 4: Monitor training
            model_url = self.monitor_training(training)

            # Step 5: Test trained model
            self.test_trained_model(model_url)

            logger.info("🎉 REAL training pipeline completed successfully!")
            logger.info(f"🎯 Your personalized FLUX model: {model_url}")

            return model_url

        except Exception as e:
            logger.error(f"❌ Real training pipeline failed: {e}")
            raise

def main():
    """Main entry point for real FLUX training"""
    print("🎯 REAL FLUX Fine-Tuning - Daniel Face Context")
    print("=" * 60)

    try:
        trainer = RealFluxTrainer()
        model_url = trainer.run_real_training()

        print(f"\n🎉 SUCCESS! Your personalized FLUX model is ready:")
        print(f"🎯 Model URL: {model_url}")
        print(f"🔥 Trigger word: DANI")
        print(f"💡 Example prompt: 'DANI portrait for tech review thumbnail'")

    except KeyboardInterrupt:
        logger.info("⏹️ Training interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()