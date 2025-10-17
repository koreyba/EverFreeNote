import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tag, X } from 'lucide-react'

export default function InteractiveTag({ tag, onRemove, onClick, showIcon = true, className = '' }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleTagClick = (e) => {
    // Prevent navigation if clicking on remove button
    if (e.target.closest('.remove-tag')) return

    // Call the onClick handler if provided
    if (onClick) {
      onClick(tag)
    }
  }

  const handleRemoveClick = (e) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(tag)
    }
  }

  return (
    <Badge
      variant="secondary"
      className={`cursor-pointer transition-all duration-200 hover:bg-green-100 hover:text-green-800 group relative ${className}`}
      onClick={handleTagClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showIcon && <Tag className="w-3 h-3 mr-1" />}
      {tag}

      {onRemove && (
        <button
          className={`remove-tag ml-2 p-0.5 rounded-full transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          } hover:bg-red-100 hover:text-red-600`}
          onClick={handleRemoveClick}
          title={`Remove tag "${tag}"`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  )
}
