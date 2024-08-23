
export default function Desc (){
    return <div class="desc hidden md:block bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg p-4 mb-6 text-left mt-8 w-[90%] m-auto">
    <h2 class="text-lg font-semibold mb-2 text-white">About WSF</h2>
    <p class="text-sm text-gray-300 mb-3">
      WSF is an open-source, secure P2P file transfer tool using WebRTC. No server storage, direct device-to-device transfer.
    </p>
    <h3 class="text-base font-medium mb-2 text-white">How to use:</h3>
    <ol class="list-decimal list-inside text-sm text-gray-300 space-y-1">
      <li>Share the link below with the recipient</li>
      <li>Wait for connection</li>
      <li>Select and send your file</li>
    </ol>
  </div>
}