class UserInteractionManager {
    private resolveCallback: ((value: unknown) => void) | null = null;
    private rejectCallback: ((reason?: any) => void) | null = null;

    public async waitForUserAction(): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        });
    }

    public triggerAction(value: unknown): void {
        if (this.resolveCallback) {
            this.resolveCallback(value);
            this.resetCallbacks();
        }
    }

    public cancelAction(reason?: any): void {
        if (this.rejectCallback) {
            this.rejectCallback(reason);
            this.resetCallbacks();
        }
    }

    private resetCallbacks(): void {
        this.resolveCallback = null;
        this.rejectCallback = null;
    }
}

const userInteractionForSelectionManager = new UserInteractionManager();
export  { userInteractionForSelectionManager }