import { createSignal, createEffect, Show } from "solid-js";

// Component for displaying a file sharing request banner
export default function AcceptBanner(props: {
  user: string;
  onDecline: () => void;
  onAccept: () => void;
  ref: (arg0: { status: boolean; open: () => void; close: () => void }) => void;
}) {
  // State to control the visibility of the banner
  const [status, setStatus] = createSignal(false);

  // Effect to expose banner control methods to parent component
  createEffect(() => {
    if (props.ref) {
      props.ref({
        status: status(),
        open: () => setStatus(true),
        close: () => setStatus(false)
      });
    }
  });

  return (
    <Show when={status()}>
      <div class="fixed bottom-4 right-4 z-[60] max-w-md w-full">
        <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div class="p-4 text-gray-200">
            <h2 class="text-lg font-semibold mb-2">
              File Sharing Request
            </h2>
            <p class="mb-4">
              User <span class="font-bold text-white">{props.user}</span> wants to share a file with you.
            </p>
            <div class="flex justify-end space-x-3">
              <button
                onClick={props.onDecline}
                class="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition duration-300"
              >
                Decline
              </button>
              <button
                onClick={props.onAccept}
                class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-white transition duration-300"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}