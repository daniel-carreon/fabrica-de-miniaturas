#!/usr/bin/env python3
"""
🔍 Supabase Investigation Tool
Investigate database state, storage buckets, and WebP auto-save functionality
"""

import os
import asyncio
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from pathlib import Path

# Supabase Configuration
SUPABASE_URL = "https://vonbztcjvrosbypuhmeo.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmJ6dGNqdnJvc2J5cHVobWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTY5MjgsImV4cCI6MjA3MzUzMjkyOH0.ZEfZ9Jrpb59L6vaum5fWp0phumuEpGcbdNjOHo9dElE"

def main():
    """Main investigation function"""
    print("🔍 Starting Supabase Investigation...")
    print("=" * 50)
    
    # Initialize Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    print(f"📡 Connected to: {SUPABASE_URL}")
    print(f"🔑 Using ANON key (truncated): {SUPABASE_ANON_KEY[:20]}...")
    print()
    
    # 1. Investigate Storage Buckets
    investigate_storage_buckets(supabase)
    
    # 2. Check Database Tables
    investigate_database_tables(supabase)
    
    # 3. Look for Recent Combined Images
    check_recent_combined_images(supabase)
    
    # 4. Verify WebP Storage Structure
    check_webp_storage_structure(supabase)
    
    print("\n✅ Investigation Complete!")

def investigate_storage_buckets(supabase: Client):
    """Investigate storage bucket structure"""
    print("🪣 === STORAGE BUCKET INVESTIGATION ===")
    
    try:
        # List all buckets
        buckets = supabase.storage.list_buckets()
        print(f"📦 Found {len(buckets)} storage buckets:")
        
        for bucket in buckets:
            print(f"  📁 {bucket.name} - Created: {bucket.created_at} - Public: {bucket.public}")
        
        # Check the 'images' bucket specifically
        bucket_name = "images"
        print(f"\n🔍 Investigating '{bucket_name}' bucket...")
        
        try:
            # List files in images bucket
            files = supabase.storage.from_(bucket_name).list()
            print(f"📄 Found {len(files)} items in '{bucket_name}' bucket:")
            
            for item in files[:10]:  # Show first 10 items
                size = item.get('metadata', {}).get('size', 'Unknown')
                last_modified = item.get('updated_at', 'Unknown')
                print(f"  📄 {item['name']} - Size: {size} bytes - Modified: {last_modified}")
            
            if len(files) > 10:
                print(f"  ... and {len(files) - 10} more files")
        
        except Exception as e:
            print(f"❌ Error listing files in '{bucket_name}': {str(e)}")
            
        # Check for WebP folder structure
        print(f"\n🔍 Checking for WebP folder structure in '{bucket_name}'...")
        try:
            webp_folders = supabase.storage.from_(bucket_name).list("combined/webp/")
            print(f"📁 Found {len(webp_folders)} items in 'combined/webp/' folder:")
            
            for folder in webp_folders[:5]:  # Show first 5 folders
                print(f"  📁 {folder['name']} - Modified: {folder.get('updated_at', 'Unknown')}")
                
        except Exception as e:
            print(f"⚠️  'combined/webp/' folder doesn't exist or is empty: {str(e)}")
        
        # Check for today's folder
        today = datetime.now().strftime('%Y-%m-%d')
        print(f"\n🔍 Checking for today's WebP folder: 'combined/webp/{today}/'...")
        try:
            today_files = supabase.storage.from_(bucket_name).list(f"combined/webp/{today}/")
            print(f"📄 Found {len(today_files)} WebP files for today:")
            
            for file in today_files:
                size = file.get('metadata', {}).get('size', 'Unknown')
                print(f"  🖼️  {file['name']} - Size: {size} bytes")
                
        except Exception as e:
            print(f"⚠️  No WebP files found for today: {str(e)}")
    
    except Exception as e:
        print(f"❌ Error investigating storage: {str(e)}")
    
    print()

def investigate_database_tables(supabase: Client):
    """Investigate database table structure"""
    print("🗄️ === DATABASE TABLES INVESTIGATION ===")
    
    # List of expected tables to check
    expected_tables = [
        'generated_images',
        'favorite_images', 
        'combined_images',
        'uploaded_images'
    ]
    
    for table_name in expected_tables:
        print(f"\n📊 Checking table: '{table_name}'")
        
        try:
            # Get table structure and recent data
            result = supabase.table(table_name).select("*").limit(5).execute()
            
            if result.data:
                print(f"  ✅ Table exists with {len(result.data)} recent records")
                print(f"  📝 Sample columns: {list(result.data[0].keys()) if result.data else 'No data'}")
                
                # Show recent records
                for i, record in enumerate(result.data[:3], 1):
                    created_at = record.get('created_at', record.get('saved_at', 'Unknown'))
                    print(f"    #{i}: ID={record.get('id', 'N/A')[:8]}... Created: {created_at}")
            else:
                print(f"  ✅ Table exists but is empty")
                
        except Exception as e:
            print(f"  ❌ Table doesn't exist or access denied: {str(e)}")
    
    print()

def check_recent_combined_images(supabase: Client):
    """Check for recent combined images entries"""
    print("🔄 === RECENT COMBINED IMAGES CHECK ===")
    
    try:
        # Check combined_images table for recent entries
        yesterday = datetime.now() - timedelta(days=1)
        
        result = supabase.table('combined_images').select(
            "*"
        ).order('created_at', desc=True).limit(10).execute()
        
        if result.data:
            print(f"✅ Found {len(result.data)} recent combined image records:")
            
            for record in result.data:
                id_short = str(record.get('id', 'N/A'))[:8]
                created_at = record.get('created_at', 'Unknown')
                webp_optimized = record.get('webp_optimized', False)
                has_supabase_url = bool(record.get('supabase_url'))
                has_source_url = bool(record.get('source_url'))
                
                print(f"  🖼️  ID: {id_short}... | Created: {created_at}")
                print(f"      📄 WebP Optimized: {webp_optimized} | Has Supabase URL: {has_supabase_url} | Has Source URL: {has_source_url}")
                
                if record.get('prompt'):
                    print(f"      💬 Prompt: {record['prompt'][:50]}...")
                
                print()
        else:
            print("⚠️  No combined images found in database")
            
    except Exception as e:
        print(f"❌ Error checking combined images: {str(e)}")
    
    print()

def check_webp_storage_structure(supabase: Client):
    """Verify the expected WebP storage structure"""
    print("🖼️ === WEBP STORAGE STRUCTURE CHECK ===")
    
    bucket_name = "images"
    expected_paths = [
        "combined/",
        "combined/webp/",
        f"combined/webp/{datetime.now().strftime('%Y-%m-%d')}/"
    ]
    
    for path in expected_paths:
        print(f"\n🔍 Checking path: '{path}'")
        
        try:
            files = supabase.storage.from_(bucket_name).list(path)
            print(f"  ✅ Path exists with {len(files)} items")
            
            # Show WebP files specifically
            webp_files = [f for f in files if f.get('name', '').lower().endswith('.webp')]
            if webp_files:
                print(f"  🖼️  Found {len(webp_files)} WebP files:")
                for webp_file in webp_files[:3]:  # Show first 3
                    size = webp_file.get('metadata', {}).get('size', 'Unknown')
                    print(f"    📄 {webp_file['name']} - Size: {size} bytes")
        
        except Exception as e:
            print(f"  ❌ Path doesn't exist or is inaccessible: {str(e)}")
    
    print()

if __name__ == "__main__":
    main()
