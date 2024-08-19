import { createMemo } from 'solid-js'
import "./avatar.css"

interface AvatarProps {
  userId: string
  size?: number
}

export default function Avatar(props: AvatarProps) {
  const size = props.size || 48
  const fontSize = createMemo(() => Math.max(size / 4, 10))
  const userId = createMemo(() => props.userId.toUpperCase())

  return (
    <div 
      class="avatar mt-4 flex items-center justify-center rounded-full overflow-hidden text-white bg-black relative "
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        'font-size': `${fontSize()}px`
      }}
    >
      <svg class="absolute" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="none" stroke="white" stroke-width="5" />
      </svg>
      <span class="relative z-10 font-bold tracking-tighter">{userId()}</span>
    </div>
  )
}