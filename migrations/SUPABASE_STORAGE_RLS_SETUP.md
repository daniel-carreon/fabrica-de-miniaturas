# 🔐 Supabase Storage RLS Policies Setup Guide

**CRITICAL**: These storage policies MUST be configured in the Supabase Dashboard because they cannot be created via SQL migrations.

## 🎯 Problem Being Solved

The application is failing with RLS errors when trying to:
1. Upload images to the `images` storage bucket
2. Access stored images for display
3. Delete images from storage

**Error Examples:**
- `new row violates row-level security policy`
- `Policy violation when uploading to Supabase Storage bucket`

## 📍 Where to Configure

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `vonbztcjvrosbypuhmeo`
3. Navigate to: **Storage** → **images** bucket → **Policies**

## 🛠️ Required Storage Policies

### Policy 1: Allow Anonymous Uploads
```
Name: "Allow anonymous uploads to images bucket"
Operation: INSERT
Target roles: anon, authenticated
USING expression: (true)
WITH CHECK expression: (true)
```

### Policy 2: Allow Anonymous Reads
```
Name: "Allow anonymous reads from images bucket"
Operation: SELECT  
Target roles: anon, authenticated
USING expression: (true)
```

### Policy 3: Allow Anonymous Updates
```
Name: "Allow anonymous updates to images bucket"
Operation: UPDATE
Target roles: anon, authenticated
USING expression: (true)
WITH CHECK expression: (true)
```

### Policy 4: Allow Anonymous Deletes
```
Name: "Allow anonymous deletes from images bucket"
Operation: DELETE
Target roles: anon, authenticated
USING expression: (true)
```

## 🔍 Verification Steps

After creating the policies, verify they work:

1. **Test Upload**: Try uploading an image via `/api/favorites`
2. **Test Read**: Access a public URL from the bucket
3. **Test Delete**: Try deleting an image via the API

## 📋 Storage Bucket Configuration

### Current Bucket Settings
- **Bucket Name**: `images`
- **Public**: ✅ Yes (required for public URLs)
- **File Size Limit**: Recommended 10MB
- **Allowed MIME Types**: `image/*`

### Folder Structure
```
images/
├── generated/     # Generated images from Flux
├── combined/      # Combined images from Nano Banana
├── favorites/     # User favorite images
└── uploads/       # User uploaded images
```

## 🚨 Security Considerations

**Why These Permissive Policies Are OK for MVP:**

1. **No User Authentication**: The app works without login
2. **Public Content**: All images are intended to be public
3. **MVP Phase**: Focusing on functionality over security
4. **Rate Limiting**: Supabase has built-in rate limits

**For Production, Consider:**
- Rate limiting policies based on IP
- File size restrictions in policies
- MIME type validation in policies
- User-based access controls if auth is added

## 🔧 Troubleshooting

### If Uploads Still Fail:
1. Check that bucket is marked as **Public**
2. Verify all 4 policies are active (green checkmark)
3. Test with curl command:
   ```bash
   curl -X POST https://vonbztcjvrosbypuhmeo.supabase.co/storage/v1/object/images/test.txt \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: text/plain" \
     -d "test content"
   ```

### If Reads Still Fail:
1. Verify public URL format: 
   ```
   https://vonbztcjvrosbypuhmeo.supabase.co/storage/v1/object/public/images/path/to/file
   ```
2. Check CORS settings in Project Settings → API

## ✅ Completion Checklist

- [ ] Created "Allow anonymous uploads" policy
- [ ] Created "Allow anonymous reads" policy  
- [ ] Created "Allow anonymous updates" policy
- [ ] Created "Allow anonymous deletes" policy
- [ ] Verified bucket is marked as Public
- [ ] Tested upload via API endpoint
- [ ] Tested public URL access
- [ ] Ran the test script: `./test_api_endpoints.sh`

## 🎯 Expected Results After Setup

**Before Fix:**
```
❌ new row violates row-level security policy
❌ Policy violation when uploading to Supabase Storage
```

**After Fix:**
```
✅ Successfully uploaded to Supabase Storage
✅ Generated public URL
✅ Saved to database without RLS errors
```

---

**📞 Need Help?** 
If you encounter issues, check the Supabase logs in Dashboard → Logs → Database for detailed error messages.
