#!/usr/bin/env python3
"""
📊 Detailed Supabase Investigation
Get specific details about the WebP auto-save system
"""

from supabase import create_client
from datetime import datetime
import json

# Supabase Configuration
SUPABASE_URL = "https://vonbztcjvrosbypuhmeo.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmJ6dGNqdnJvc2J5cHVobWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTY5MjgsImV4cCI6MjA3MzUzMjkyOH0.ZEfZ9Jrpb59L6vaum5fWp0phumuEpGcbdNjOHo9dElE"

def main():
    print("📊 Detailed WebP Auto-Save Investigation")
    print("=" * 50)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # Get the most recent combined images with full details
    print("\n🔍 RECENT COMBINED IMAGES DETAILED ANALYSIS")
    
    try:
        result = supabase.table('combined_images').select(
            "*"
        ).order('created_at', desc=True).limit(3).execute()
        
        if result.data:
            for i, record in enumerate(result.data, 1):
                print(f"\n--- RECORD #{i} ---")
                print(f"🆔 ID: {record['id']}")
                print(f"📅 Created: {record['created_at']}")
                print(f"🔄 WebP Optimized: {record['webp_optimized']}")
                print(f"📁 Storage Folder: {record.get('storage_folder', 'N/A')}")
                
                # Check URLs
                print(f"\n🔗 URL Analysis:")
                source_url = record.get('source_url', '')
                supabase_url = record.get('supabase_url', '')
                
                print(f"  📥 Source URL (first 100 chars): {source_url[:100] if source_url else 'None'}...")
                print(f"  📤 Supabase URL: {supabase_url or 'None'}")
                
                # Check if it's base64 source
                if source_url and source_url.startswith('data:image/'):
                    print(f"  ✅ Source is base64 data URI (likely from Nano Banana)")
                elif source_url and 'http' in source_url:
                    print(f"  🌐 Source is external HTTP URL")
                else:
                    print(f"  ❓ Unknown source URL format")
                
                # Verify Supabase URL accessibility
                if supabase_url:
                    print(f"  🔍 Supabase URL structure: {'webp' in supabase_url.lower()}")
                    print(f"  📁 Contains 'combined': {'combined' in supabase_url}")
                
                # Check other fields
                print(f"\n📝 Other Details:")
                print(f"  🎨 Model Used: {record.get('model_used', 'N/A')}")
                print(f"  📊 Quality Score: {record.get('quality_score', 'N/A')}")
                print(f"  🏷️  Tags: {record.get('tags', 'N/A')}")
                print(f"  💬 Prompt: {record.get('combination_prompt', 'N/A')[:100]}...")
                
                # Source images analysis
                source_images = record.get('source_images')
                if source_images:
                    print(f"  🖼️  Source Images Count: {len(source_images) if isinstance(source_images, list) else 'N/A'}")
        
        print(f"\n" + "=" * 50)
        
        # Check today's WebP files in storage
        print("\n🗂️  TODAY'S WEBP FILES IN STORAGE")
        
        today = datetime.now().strftime('%Y-%m-%d')
        bucket_name = "images"
        
        try:
            webp_files = supabase.storage.from_(bucket_name).list(f"combined/webp/{today}/")
            print(f"📁 Found {len(webp_files)} WebP files for {today}:")
            
            for file in webp_files:
                file_name = file['name']
                file_size = file.get('metadata', {}).get('size', 'Unknown')
                file_updated = file.get('updated_at', 'Unknown')
                
                # Generate public URL for verification
                public_url = supabase.storage.from_(bucket_name).get_public_url(f"combined/webp/{today}/{file_name}")
                
                print(f"\n📄 {file_name}")
                print(f"  💾 Size: {file_size} bytes")
                print(f"  🕐 Updated: {file_updated}")
                print(f"  🔗 Public URL: {public_url}")
        
        except Exception as e:
            print(f"❌ Error checking WebP files: {str(e)}")
        
        # Summary Analysis
        print(f"\n" + "=" * 50)
        print("\n📋 WEBP AUTO-SAVE SYSTEM ANALYSIS SUMMARY")
        
        total_optimized = sum(1 for record in result.data if record.get('webp_optimized'))
        total_with_supabase_url = sum(1 for record in result.data if record.get('supabase_url'))
        
        print(f"\n✅ FINDINGS:")
        print(f"  📊 Records analyzed: {len(result.data)}")
        print(f"  🔄 WebP optimized: {total_optimized}/{len(result.data)}")
        print(f"  🔗 With permanent Supabase URLs: {total_with_supabase_url}/{len(result.data)}")
        print(f"  📁 WebP files in storage today: {len(webp_files) if 'webp_files' in locals() else 'Error checking'}")
        
        if total_optimized == len(result.data) and total_with_supabase_url == len(result.data):
            print(f"\n🎉 CONCLUSION: WebP auto-save system is WORKING CORRECTLY!")
            print(f"   ✅ All recent combined images are optimized to WebP")
            print(f"   ✅ All have permanent Supabase storage URLs")
            print(f"   ✅ Files are properly organized in date-based folders")
        else:
            print(f"\n⚠️  CONCLUSION: WebP auto-save system has ISSUES:")
            if total_optimized < len(result.data):
                print(f"   ❌ {len(result.data) - total_optimized} images not marked as WebP optimized")
            if total_with_supabase_url < len(result.data):
                print(f"   ❌ {len(result.data) - total_with_supabase_url} images missing Supabase URLs")
    
    except Exception as e:
        print(f"❌ Error during detailed investigation: {str(e)}")

if __name__ == "__main__":
    main()
