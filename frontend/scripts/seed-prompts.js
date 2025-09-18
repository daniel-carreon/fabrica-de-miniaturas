const fs = require('fs')
const path = require('path')

// Read the predefined prompts
const promptsPath = path.join(__dirname, '../../predefined-prompts.json')
const predefinedPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'))

const API_BASE_URL = 'http://localhost:3006'

async function seedPrompts() {
  console.log('🌱 Starting to seed predefined prompts...')

  let successCount = 0
  let errorCount = 0

  for (const promptData of predefinedPrompts) {
    try {
      console.log(`📝 Creating prompt: ${promptData.name}`)

      const response = await fetch(`${API_BASE_URL}/api/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: promptData.name,
          prompt: promptData.prompt,
          category: promptData.category,
          tags: promptData.tags,
          is_favorite: false,
          user_id: null // Public predefined prompts
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Created prompt: ${promptData.name} (ID: ${result.data.id})`)
        successCount++
      } else {
        const error = await response.json()
        console.error(`❌ Failed to create prompt: ${promptData.name}`, error)
        errorCount++
      }
    } catch (error) {
      console.error(`❌ Error creating prompt: ${promptData.name}`, error.message)
      errorCount++
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n🎉 Seeding completed!')
  console.log(`✅ Successfully created: ${successCount} prompts`)
  console.log(`❌ Failed to create: ${errorCount} prompts`)

  if (errorCount === 0) {
    console.log('🎯 All predefined prompts have been successfully added to the database!')
  }
}

// Run the seeding script
seedPrompts().catch(error => {
  console.error('❌ Seeding script failed:', error)
  process.exit(1)
})