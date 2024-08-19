import Avatar from './avatar/avatar';
import Logo from './logo/logo';

export default function Header(props: { store: any, setStore: any }) {
    return <header class="sticky top-0 inset-x-0 flex flex-wrap items-center md:justify-start md:items-center md:flex-nowrap z-50 w-[90%] m-auto text-sm">
        <nav class="mt-4 relative max-w-2xl lg:w-full bg-white border border-gray-200 rounded-[2rem] mx-2 py-2.5 md:flex md:items-center md:justify-between md:py-0 md:px-4 md:mx-auto dark:bg-neutral-900 dark:border-neutral-700 md:w-[80%]">
            <div class="px-4 md:px-0 flex justify-between items-center">

                <div>
                    <a class="flex-none rounded-md text-xl inline-block font-semibold focus:outline-none focus:opacity-80" href="../templates/personal/index.html" aria-label="Preline">
                        <Logo />
                    </a>
                </div>


                <div class="md:hidden">

                    <button type="button" class="hs-collapse-toggle flex justify-center items-center size-6 border border-gray-200 text-gray-500 rounded-full hover:bg-gray-200 focus:outline-none focus:bg-gray-200 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700" id="hs-navbar-header-floating-collapse" aria-expanded="false" aria-controls="hs-navbar-header-floating" aria-label="Toggle navigation" data-hs-collapse="#hs-navbar-header-floating">
                        <svg class="hs-collapse-open:hidden shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                        <svg class="hs-collapse-open:block hidden shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>

                </div>
            </div>

            <div id="hs-navbar-header-floating" class="hidden hs-collapse overflow-hidden transition-all duration-300 basis-full grow md:block" aria-labelledby="hs-navbar-header-floating-collapse">
                <div class="flex flex-col md:flex-row md:items-center md:justify-end gap-2 md:gap-3 mt-3 md:mt-0 py-2 md:py-0 md:ps-7">

                    <a href="https://github.com/unrealyan/wsf" target="_blank" class="github-icon" title="View on GitHub">
                        <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true">
                            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                        </svg>
                    </a>
                </div>
            </div>
        </nav>
        <div class="feedback flex items-center justify-center mt-4 mr-2">
            <a href="https://t.me/wsf009" target="_blank" class="telegram-icon flex items-center" title="Join Telegram Group and Provide Feedback">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2l-18.5 9 6 3 9-7-7 9 11 4-0.5-18z"></path>
                </svg>
                <span class="ml-2 text-white">Feedback</span>
            </a>
        </div>
        <Avatar userId={props.store.userId} />
    </header>
}