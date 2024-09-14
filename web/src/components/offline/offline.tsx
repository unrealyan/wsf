export default function Offline({message}:{message:string}) {
    return (
        <div class="text-gray-400 mt-8 text-xl text-center flex justify-center items-center flex-col">
            <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M25,60 Q10,60 10,45 Q10,30 25,30 Q25,10 50,10 Q75,10 75,30 Q90,30 90,45 Q90,60 75,60"
                    style="fill: none; stroke: #000000; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round;" />

                <line x1="20" y1="80" x2="80" y2="20"
                    style="fill: none; stroke: #ff0000; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round;" />
            </svg>
            <p>{message}</p>
        </div>
    );
}