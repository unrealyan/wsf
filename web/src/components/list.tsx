import { createSignal, createEffect, onCleanup, For, JSX } from 'solid-js';

interface InfiniteScrollProps<T> {
  items: T[];
  renderItem: (item: T) => JSX.Element;
  loadMore: () => void;
  hasMore: boolean;
  loader?: JSX.Element;
}

export default function InfiniteScroll<T>(props: InfiniteScrollProps<T>) {
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null);

  const handleScroll = () => {
    const container = containerRef();
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        if (props.hasMore) {
          props.loadMore();
        }
      }
    }
  };

  createEffect(() => {
    const container = containerRef();
    if (container) {
      container.addEventListener('scroll', handleScroll);
      onCleanup(() => container.removeEventListener('scroll', handleScroll));
    }
  });

  return (
    <div ref={setContainerRef} style={{ height: '800px', overflow: 'auto' }}>
      <For each={props.items}>
        {(item) => props.renderItem(item)}
      </For>
      {props.hasMore && (props.loader || <div>加载中...</div>)}
    </div>
  );
}