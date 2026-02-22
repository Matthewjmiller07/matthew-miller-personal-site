#!/usr/bin/env python3
"""
Face Looker - Generate AI-powered gaze-tracking face images
"""

import os
import csv
import argparse
import time
import replicate
from pathlib import Path
from typing import List, Tuple


def generate_face_images(
    image_path: str,
    output_dir: str,
    min_val: float = -15,
    max_val: float = 15,
    step: float = 15,
    size: int = 256,
    skip_existing: bool = True
) -> None:
    """
    Generate a grid of face images with different gaze directions.
    
    Args:
        image_path: Path to the input face image
        output_dir: Directory to save generated images
        min_val: Minimum gaze value
        max_val: Maximum gaze value
        step: Step size between gaze values
        size: Output image size
        skip_existing: Skip files that already exist
    """
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Generate gaze values
    gaze_values = []
    current = min_val
    while current <= max_val:
        gaze_values.append(current)
        current += step
    
    print(f"Generating face images from: {image_path}")
    print(f"Output directory: {output_dir}")
    print(f"Parameters: min={min_val}, max={max_val}, step={step}, size={size}")
    print(f"Generating {len(gaze_values)}x{len(gaze_values)} = {len(gaze_values) * len(gaze_values)} images...")
    print(f"Gaze values: {gaze_values}")
    
    # Generate images
    csv_data = []
    total_images = len(gaze_values) * len(gaze_values)
    current_image = 0
    
    for py in gaze_values:
        for px in gaze_values:
            current_image += 1
            filename = f"gaze_px{px}_py{py}_{size}.webp"
            filepath = output_path / filename
            
            print(f"[{current_image}/{total_images}] Generating {filename}...")
            
            # Skip if file exists and skip_existing is True
            if skip_existing and filepath.exists():
                print(f"  Skipping (already exists)")
                csv_data.append([filename, px, py])
                continue
            
            try:
                # Generate image using Replicate - use the correct expression editor model version
                # The model expects image as a URI, so we need to read it and provide as data URI or upload
                print(f"  Preparing image and calling Replicate API with pupil_x={px}, pupil_y={py}...")
                
                # Read image and convert to base64 data URI
                import base64
                with open(image_path, "rb") as img_file:
                    img_data = img_file.read()
                    img_base64 = base64.b64encode(img_data).decode()
                    # Get file extension
                    ext = Path(image_path).suffix.lower()
                    data_uri = f"data:image/{ext[1:]};base64,{img_base64}"
                
                # Add retry mechanism
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        output = replicate.run(
                            "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86",
                            input={
                                "image": data_uri,  # Use data URI
                                "pupil_x": px,
                                "pupil_y": py,
                                "output_format": "webp",
                                "output_quality": 95,
                                "crop_factor": 1.7,
                                "src_ratio": 1,
                                "sample_ratio": 1
                            },
                            timeout=120  # Increase timeout to 2 minutes
                        )
                        break  # Success, exit retry loop
                    except Exception as retry_error:
                        print(f"    Attempt {attempt + 1} failed: {retry_error}")
                        if attempt == max_retries - 1:
                            raise retry_error
                        time.sleep(2)  # Wait before retry
                
                # Save the generated image
                if output:
                    # Handle different output formats from Replicate
                    if hasattr(output, '__iter__') and not isinstance(output, str):
                        # If it's a list/array, get the first item
                        image_data = output[0] if len(output) > 0 else output
                    else:
                        # If it's a single item
                        image_data = output
                    
                    # If it's a FileOutput object, get the URL and download
                    if hasattr(image_data, 'url'):
                        import requests
                        response = requests.get(image_data.url)
                        if response.status_code == 200:
                            with open(filepath, "wb") as f:
                                f.write(response.content)
                            print(f"  Saved to {filepath}")
                        else:
                            print(f"  Failed to download image: {response.status_code}")
                    elif isinstance(image_data, bytes):
                        # If it's already bytes
                        with open(filepath, "wb") as f:
                            f.write(image_data)
                        print(f"  Saved to {filepath}")
                    else:
                        print(f"  Unexpected output format: {type(image_data)}")
                else:
                    print(f"  No output generated")
                
                csv_data.append([filename, px, py])
                
            except Exception as e:
                print(f"  Error: {e}")
                csv_data.append([filename, px, py])
    
    # Save CSV index
    csv_path = output_path / "index.csv"
    with open(csv_path, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["filename", "pupil_x", "pupil_y"])
        writer.writerows(csv_data)
    
    print(f"\nDone! Generated {total_images - len([f for f in csv_data if 'Error' in str(f)])} images.")
    print(f"Images saved to: {output_dir}")
    print(f"Index saved to: {csv_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate face tracking images")
    parser.add_argument("--image", required=True, help="Path to input face image")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--min", type=float, default=-15, help="Minimum gaze value")
    parser.add_argument("--max", type=float, default=15, help="Maximum gaze value")
    parser.add_argument("--step", type=float, default=15, help="Step size")
    parser.add_argument("--size", type=int, default=256, help="Output image size")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    
    args = parser.parse_args()
    
    # Check if REPLICATE_API_TOKEN is set
    if not os.getenv("REPLICATE_API_TOKEN"):
        print("Error: REPLICATE_API_TOKEN environment variable not set")
        print("Set it with: export REPLICATE_API_TOKEN=your_token_here")
        return 1
    
    generate_face_images(
        args.image,
        args.out,
        args.min,
        args.max,
        args.step,
        args.size,
        skip_existing=not args.force
    )
    
    return 0


if __name__ == "__main__":
    exit(main())
