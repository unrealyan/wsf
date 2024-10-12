import { createSignal, Show } from 'solid-js';
import { StoreType, useStore } from '../../lib/store';

interface ErrorMessageProps {
  message: string|undefined;
  type: string|undefined;
  duration?: number;
}

export default function ErrorMessage(props: ErrorMessageProps) {
  // const [visible, setVisible] = createSignal(true);

  const [,action]:StoreType=useStore()
  if (props.duration) {
    setTimeout(() => close, props.duration);
  }

  const getBackgroundColor = (type:string) => {
    switch (type) {
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'success':
        return 'bg-green-500';
      case 'notice':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const close = ()=>{
    action.setAlertMsg({
      type: '',
      message: ''
    })
  }

  return (
    <Show when={props.message}>
      <div class={`fixed z-[9999] top-4 right-4 ${getBackgroundColor(props?.type || "")} text-white px-4 py-2 rounded shadow-lg flex items-center`}>
        <span>{props.message}</span>
        <button
          class="ml-2 text-white hover:text-gray-200 focus:outline-none"
          onClick={close}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Show>
  );
}