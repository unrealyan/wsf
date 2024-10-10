import { createMemo } from 'solid-js'
import "./avatar.css"
import { useNavigate } from '@solidjs/router'

interface AvatarProps {
  userId: string
  picture: string
  size?: number
}

export default function Avatar(props: AvatarProps) {
  const navigate = useNavigate();
  const size = props.size || 48
  const fontSize = createMemo(() => Math.max(size / 4, 10))
  // const userId = createMemo(() => props.userId.toUpperCase())
  

  return (
    <div
      class="avatar mt-4 flex items-center justify-center rounded-full overflow-hidden text-white bg-black relative hover:cursor-pointer"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        'font-size': `${fontSize()}px`
      }}
      onClick={()=>navigate("/profile")}
    >
      <svg class="absolute" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="none" stroke="white" stroke-width="5" />
      </svg>
      <span class="relative z-10 font-bold tracking-tighter">{props.userId.substring(0,4)}</span>
      {/* <img class="relative z-10 font-bold tracking-tighter rounded-full w-[32px]" src={props.picture} alt={props.userId} srcset="" /> */}
    </div>
  )
}