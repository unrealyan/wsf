import { createSignal, createEffect } from "solid-js";

export default function AcceptBanner(props: {
  user: string;
  onDecline:()=>void
  onAccept: () => void; ref: (arg0: { open: () => void; close: () => void; }) => void;
}) {
  const [status, setStatus] = createSignal(false);


  createEffect(() => {
    if (props.ref) {
      props.ref({
        open: () => setStatus(true),
        close: () => setStatus(false)
      });
    }
  })


  return <>
    {
      status() ? <div class="fixed bottom-0 end-0 z-[60] sm:max-w-xl w-full mx-auto p-6">
        <div class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
          <div class="flex flex-col sm:flex-row sm:items-center gap-y-3 sm:gap-y-0 sm:gap-x-5">
            <div class="grow">
              <h2 class="text-gray-500 dark:text-neutral-500">
                <span class="font-semibold text-gray-800 dark:text-neutral-200">User {props.user}</span> wants to share a file
              </h2>
            </div>
            <div class="inline-flex gap-x-2">
              <div>
                <button onClick={props.onDecline} type="button" class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700">
                  Reject
                </button>
              </div>
              <div>
                <button onClick={props.onAccept} type="button" class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      </div> : null
    }
  </>
}