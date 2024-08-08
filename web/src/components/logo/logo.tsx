import "./logo.css"

export default function Logo() {
    return (
        <div class="logo flex">
            <svg class="icon" viewBox="0 0 24 24" width="48" height="48">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 18.5L4 16v-7l8 4 8-4v7l-8 4.5z" fill="currentColor" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <div class="site-name">RTCFS</div>
        </div>
    )
}