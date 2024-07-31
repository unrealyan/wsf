import { createSignal, JSXElement, onCleanup } from 'solid-js';

interface CopyProps {
  text: string;
  children?: JSXElement;
  onCopy?: () => void;
}

const Copy: (props: CopyProps) => JSXElement = (props) => {
  const [isCopied, setIsCopied] = createSignal(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(props.text);
    setIsCopied(true);
    if (props.onCopy) {
      props.onCopy();
    }
  };

  onCleanup(() => {
    setIsCopied(false);
  });

  return (
    <div class="copy-container flex justify-center m-2">
      {props.children}
      <button class="copy-button text-blue-400 ml-4" onClick={handleCopy}>
        {isCopied() ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};

export default Copy;