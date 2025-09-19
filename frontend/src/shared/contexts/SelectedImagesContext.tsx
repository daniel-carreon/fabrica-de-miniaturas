'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface SelectedImage {
  id: string
  url: string
  source: string
}

interface SelectedImagesContextType {
  selectedImages: SelectedImage[]
  setSelectedImages: React.Dispatch<React.SetStateAction<SelectedImage[]>>
  handleImageSelect: (imageId: string, imageUrl: string, source: string) => void
  isImageSelected: (imageId: string) => boolean
  isImageDisabled: (imageId: string) => boolean
  clearSelection: () => void
  maxSelection: number
}

const SelectedImagesContext = createContext<SelectedImagesContextType | undefined>(undefined)

export function SelectedImagesProvider({ children }: { children: ReactNode }) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const maxSelection = 50 // Much higher limit for delete mode

  const handleImageSelect = (imageId: string, imageUrl: string, source: string) => {
    const isAlreadySelected = selectedImages.some(img => img.id === imageId)

    if (isAlreadySelected) {
      // Deselect
      setSelectedImages(prev => prev.filter(img => img.id !== imageId))
    } else {
      // Select (max 2)
      if (selectedImages.length < maxSelection) {
        setSelectedImages(prev => [...prev, { id: imageId, url: imageUrl, source }])
      } else {
        // Replace oldest selection
        setSelectedImages(prev => [prev[1], { id: imageId, url: imageUrl, source }])
      }
    }
  }

  const isImageSelected = (imageId: string) => {
    return selectedImages.some(img => img.id === imageId)
  }

  const isImageDisabled = (imageId: string) => {
    // Disable if we're at max capacity AND this image is not already selected
    return selectedImages.length >= maxSelection && !isImageSelected(imageId)
  }

  const clearSelection = () => {
    setSelectedImages([])
  }

  return (
    <SelectedImagesContext.Provider value={{
      selectedImages,
      setSelectedImages,
      handleImageSelect,
      isImageSelected,
      isImageDisabled,
      clearSelection,
      maxSelection
    }}>
      {children}
    </SelectedImagesContext.Provider>
  )
}

export function useSelectedImages() {
  const context = useContext(SelectedImagesContext)
  if (context === undefined) {
    throw new Error('useSelectedImages must be used within a SelectedImagesProvider')
  }
  return context
}